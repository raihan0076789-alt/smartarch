// js/subscription.js
// Handles subscription status display, Razorpay upgrade flow, and plan UI state.
// Depends on: api.js (window.api), showToast(), showLoading(), hideLoading()

(function () {

    // ── Plan labels & colours ──────────────────────────────────────────────
    const PLAN_META = {
        free:       { label: 'Free',       badgeClass: 'free',       color: '#94a3b8' },
        pro:        { label: 'Pro',        badgeClass: 'pro',        color: '#00d4c8' },
        enterprise: { label: 'Enterprise', badgeClass: 'enterprise', color: '#a5b4fc' }
    };

    // ── Load + render current plan status ─────────────────────────────────
    async function loadSubscriptionStatus() {
        const banner = document.getElementById('subStatusBanner');
        if (!banner) return;

        try {
            const data = await window.api.getSubscriptionStatus();
            const plan = data.plan || 'free';
            const meta = PLAN_META[plan] || PLAN_META.free;

            // AI message usage
            const aiUsed  = data.aiMessages?.used  ?? 0;
            const aiLimit = data.aiMessages?.limit;          // null = unlimited
            const aiText  = aiLimit === null ? 'Unlimited AI messages' : `${aiUsed} / ${aiLimit} AI messages used this month`;

            // Bar fill
            let barPct = 0, barClass = '';
            if (aiLimit !== null && aiLimit > 0) {
                barPct = Math.min(100, Math.round((aiUsed / aiLimit) * 100));
                barClass = barPct >= 90 ? 'danger' : barPct >= 70 ? 'warn' : '';
            }

            // Expiry line
            let expiryText = plan === 'free' ? 'No expiry — free plan' : '';
            if (data.planExpiresAt) {
                const d = new Date(data.planExpiresAt);
                expiryText = `Renews on ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`;
            }

            banner.innerHTML = `
                <div style="display:flex;flex-direction:column;gap:2px;flex:1;">
                    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
                        <span class="sub-plan-badge ${meta.badgeClass}">
                            <i class="fas fa-crown" style="font-size:10px;"></i> ${meta.label}
                        </span>
                        <h3 style="margin:0;font-size:1rem;font-weight:600;color:#f1f5f9;">Your current plan</h3>
                    </div>
                    <p style="margin:4px 0 0;font-size:0.82rem;color:#64748b;">${expiryText}</p>
                    ${aiLimit !== null ? `
                    <div class="sub-ai-bar" style="margin-top:10px;">
                        <div class="sub-ai-bar-track">
                            <div class="sub-ai-bar-fill ${barClass}" style="width:${barPct}%"></div>
                        </div>
                        <span class="sub-ai-label">${aiText}</span>
                    </div>` : `<p style="margin:8px 0 0;font-size:0.8rem;color:#00d4c8;">
                        <i class="fas fa-infinity"></i> Unlimited AI messages
                    </p>`}
                </div>
            `;

            // Update card highlight + button states
            updatePlanCards(plan);

        } catch (err) {
            console.error('loadSubscriptionStatus:', err);
            banner.innerHTML = `<p style="color:#ef4444;font-size:0.85rem;">Could not load plan info.</p>`;
        }
    }

    // ── Highlight active plan card, disable current plan button ───────────
    function updatePlanCards(currentPlan) {
        ['free', 'pro', 'enterprise'].forEach(plan => {
            const card = document.getElementById(`planCard-${plan}`);
            const btn  = document.getElementById(`planBtn-${plan}`);
            if (!card || !btn) return;

            card.classList.toggle('current', plan === currentPlan);

            if (plan === currentPlan) {
                btn.textContent = 'Current plan';
                btn.classList.add('current-btn');
                btn.disabled = true;
            } else if (plan === 'free') {
                // Downgrade — handled via cancellation, not a simple action
                btn.textContent = 'Downgrade to Free';
                btn.classList.remove('current-btn');
                btn.disabled = false;
                btn.onclick = () => showToast('To cancel, contact support or let your subscription expire.', 'info');
            } else {
                btn.textContent = plan === 'pro' ? 'Upgrade to Pro' : 'Upgrade to Enterprise';
                btn.classList.remove('current-btn');
                btn.disabled = false;
                btn.onclick = () => startUpgrade(plan);
            }
        });
    }

    // ── Razorpay upgrade flow ─────────────────────────────────────────────
    async function startUpgrade(plan) {
        if (!['pro', 'enterprise'].includes(plan)) return;

        try {
            showLoading('Preparing payment…');
            const res = await window.api.createSubscriptionOrder(plan);
            hideLoading();

            if (!res.success) {
                showToast(res.message || 'Could not initiate payment.', 'error');
                return;
            }

            const options = {
                key:         res.razorpayKeyId,
                amount:      res.order.amount,
                currency:    res.order.currency,
                name:        'SmartArch',
                description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Plan — Monthly`,
                order_id:    res.order.id,
                theme:       { color: '#00d4c8' },

                handler: async function (response) {
                    try {
                        showLoading('Verifying payment…');
                        const verify = await window.api.verifySubscriptionPayment({
                            razorpay_order_id:   response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature:  response.razorpay_signature,
                            plan
                        });
                        hideLoading();

                        if (verify.success) {
                            showToast(`🎉 ${plan.charAt(0).toUpperCase() + plan.slice(1)} plan activated!`, 'success');
                            // Refresh status banner and plan cards
                            loadSubscriptionStatus();
                        } else {
                            showToast(verify.message || 'Payment verification failed.', 'error');
                        }
                    } catch (err) {
                        hideLoading();
                        showToast('Payment verification error. Contact support.', 'error');
                        console.error('Verify error:', err);
                    }
                },

                modal: {
                    ondismiss: function () {
                        showToast('Payment cancelled.', 'info');
                    }
                },

                prefill: (function () {
                    try {
                        const u = JSON.parse(localStorage.getItem('user') || '{}');
                        return { name: u.name || '', email: u.email || '', contact: u.phone || '' };
                    } catch { return {}; }
                })()
            };

            const rzp = new Razorpay(options);
            rzp.on('payment.failed', function (response) {
                showToast(`Payment failed: ${response.error.description}`, 'error');
            });
            rzp.open();

        } catch (err) {
            hideLoading();
            showToast('Something went wrong. Please try again.', 'error');
            console.error('startUpgrade error:', err);
        }
    }

    // ── Expose to global scope (called from HTML onclick and dashboard.js) ─
    window.startUpgrade           = startUpgrade;
    window.loadSubscriptionStatus = loadSubscriptionStatus;

})();