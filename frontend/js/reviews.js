// frontend/js/reviews.js
// Project-Level Reviews Panel — loaded only on architect.html
// Depends on: api.js (window.api), auth.js (window.currentUser)

(function () {
    'use strict';

    // ── State ─────────────────────────────────────────────────────────────────
    let _projectId   = null;
    let _myReview    = null;   // existing review by current user, or null
    let _pendingRating = 0;

    // ── Init (called after project loads) ────────────────────────────────────
    window.initReviewsPanel = function (projectId) {
        _projectId = projectId;
        loadReviews();
    };

    // ── Load & render ─────────────────────────────────────────────────────────
    async function loadReviews() {
        const panel = document.getElementById('reviewsPanel');
        if (!panel || !_projectId) return;

        panel.innerHTML = '<div class="rv-loading"><i class="fas fa-spinner fa-spin"></i> Loading reviews…</div>';

        try {
            const res = await api.getProjectReviews(_projectId);
            renderPanel(res.data);
        } catch (err) {
            panel.innerHTML = `<p class="rv-error">Could not load reviews.</p>`;
        }
    }

    function renderPanel(data) {
        const panel = document.getElementById('reviewsPanel');
        if (!panel) return;

        const { reviews, summary, myReview } = data;
        _myReview = myReview;

        panel.innerHTML = `
            ${renderSummaryBar(summary)}
            ${renderForm(myReview)}
            ${renderList(reviews)}
        `;

        // Wire up star hover & click
        wireStars();
        // Pre-fill if user already has a review
        if (myReview) prefillForm(myReview);
    }

    // ── Summary bar ───────────────────────────────────────────────────────────
    function renderSummaryBar(summary) {
        if (!summary.total) {
            return `<div class="rv-empty-summary"><i class="fas fa-star" style="color:#f59e0b"></i> No reviews yet — be the first!</div>`;
        }
        const stars = renderStarsDisplay(summary.average);
        const bars  = [5, 4, 3, 2, 1].map(n => {
            const count = summary.distribution[n - 1];
            const pct   = summary.total ? Math.round((count / summary.total) * 100) : 0;
            return `
                <div class="rv-dist-row">
                    <span class="rv-dist-label">${n}★</span>
                    <div class="rv-dist-bar-wrap"><div class="rv-dist-bar" style="width:${pct}%"></div></div>
                    <span class="rv-dist-count">${count}</span>
                </div>`;
        }).join('');

        return `
            <div class="rv-summary">
                <div class="rv-avg-block">
                    <div class="rv-avg-num">${summary.average}</div>
                    <div class="rv-avg-stars">${stars}</div>
                    <div class="rv-avg-total">${summary.total} review${summary.total !== 1 ? 's' : ''}</div>
                </div>
                <div class="rv-dist-block">${bars}</div>
            </div>`;
    }

    // ── Review form ───────────────────────────────────────────────────────────
    function renderForm(existing) {
        const label  = existing ? 'Update Your Review' : 'Leave a Review';
        const btnLbl = existing ? 'Update' : 'Submit';
        const delBtn = existing
            ? `<button class="rv-del-btn" onclick="deleteMyReview()" title="Delete your review"><i class="fas fa-trash-alt"></i></button>`
            : '';

        return `
            <div class="rv-form" id="rvForm">
                <div class="rv-form-header">
                    <span class="rv-form-title">${label}</span>
                    ${delBtn}
                </div>
                <div class="rv-stars-input" id="rvStarsInput">
                    ${[1,2,3,4,5].map(n => `<i class="rv-star fas fa-star" data-val="${n}"></i>`).join('')}
                </div>
                <textarea id="rvComment" class="rv-comment-input" rows="2"
                    placeholder="Share your thoughts about this design… (optional)"
                    maxlength="1000"></textarea>
                <div class="rv-form-actions">
                    <button class="rv-submit-btn" id="rvSubmitBtn" onclick="submitReview()">${btnLbl}</button>
                </div>
            </div>`;
    }

    // ── Review list ───────────────────────────────────────────────────────────
    function renderList(reviews) {
        if (!reviews.length) return '';

        const items = reviews.map(r => {
            const isMe = window.currentUser && r.reviewer._id === window.currentUser._id;
            const avatar = r.reviewer.avatar
                ? `<img src="${r.reviewer.avatar}" class="rv-avatar-img" alt="">`
                : `<div class="rv-avatar-initials">${(r.reviewer.name || '?')[0].toUpperCase()}</div>`;
            const date = new Date(r.createdAt).toLocaleDateString('en-US', { year:'numeric', month:'short', day:'numeric' });

            return `
                <div class="rv-item ${isMe ? 'rv-mine' : ''}">
                    <div class="rv-item-header">
                        <div class="rv-avatar">${avatar}</div>
                        <div class="rv-item-meta">
                            <span class="rv-reviewer-name">${escHtml(r.reviewer.name)}${isMe ? ' <span class="rv-you-badge">You</span>' : ''}</span>
                            <div class="rv-item-stars">${renderStarsDisplay(r.rating)}</div>
                        </div>
                        <span class="rv-item-date">${date}</span>
                    </div>
                    ${r.comment ? `<p class="rv-item-comment">${escHtml(r.comment)}</p>` : ''}
                </div>`;
        }).join('');

        return `<div class="rv-list">${items}</div>`;
    }

    // ── Star helpers ──────────────────────────────────────────────────────────
    function renderStarsDisplay(rating) {
        return [1,2,3,4,5].map(n => {
            const full  = n <= Math.floor(rating);
            const half  = !full && n - 0.5 <= rating;
            const cls   = full ? 'fas fa-star' : half ? 'fas fa-star-half-alt' : 'far fa-star';
            return `<i class="${cls}" style="color:#f59e0b;font-size:0.75rem"></i>`;
        }).join('');
    }

    function wireStars() {
        const container = document.getElementById('rvStarsInput');
        if (!container) return;
        const stars = container.querySelectorAll('.rv-star');

        stars.forEach(star => {
            star.addEventListener('mouseenter', () => highlightStars(parseInt(star.dataset.val)));
            star.addEventListener('mouseleave', () => highlightStars(_pendingRating));
            star.addEventListener('click', () => {
                _pendingRating = parseInt(star.dataset.val);
                highlightStars(_pendingRating);
            });
        });
    }

    function highlightStars(val) {
        const stars = document.querySelectorAll('#rvStarsInput .rv-star');
        stars.forEach(s => {
            const n = parseInt(s.dataset.val);
            s.style.color = n <= val ? '#f59e0b' : '#4a5568';
        });
    }

    function prefillForm(review) {
        _pendingRating = review.rating;
        highlightStars(review.rating);
        const ta = document.getElementById('rvComment');
        if (ta) ta.value = review.comment || '';
    }

    // ── Submit ────────────────────────────────────────────────────────────────
    window.submitReview = async function () {
        if (!_pendingRating) {
            showToast('Please select a star rating', 'error');
            return;
        }
        const comment = (document.getElementById('rvComment')?.value || '').trim();
        const btn     = document.getElementById('rvSubmitBtn');
        if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

        try {
            await api.upsertReview(_projectId, _pendingRating, comment);
            showToast(_myReview ? 'Review updated!' : 'Review submitted!', 'success');
            loadReviews();
        } catch (err) {
            showToast(err.message || 'Could not save review', 'error');
            if (btn) { btn.disabled = false; btn.textContent = _myReview ? 'Update' : 'Submit'; }
        }
    };

    window.deleteMyReview = async function () {
        if (!confirm('Delete your review?')) return;
        try {
            await api.deleteReview(_projectId);
            _myReview      = null;
            _pendingRating = 0;
            showToast('Review deleted', 'success');
            loadReviews();
        } catch (err) {
            showToast(err.message || 'Could not delete review', 'error');
        }
    };

    // ── Utility ───────────────────────────────────────────────────────────────
    function escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

})();