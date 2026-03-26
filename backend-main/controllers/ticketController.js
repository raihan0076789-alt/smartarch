// backend-main/controllers/ticketController.js
const Ticket = require('../models/Ticket');
const sendEmail = require('../utils/sendEmail');

// ─── Helper: Email Templates ──────────────────────────────────────────────────

function adminNotifyHtml(ticket) {
    return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0d1424;color:#f1f5f9;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#00d4c8,#0891b2);padding:24px 32px;">
        <h1 style="margin:0;font-size:1.3rem;color:#fff;">📩 New Support Ticket</h1>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:0.9rem;">SmartArch Support System</p>
      </div>
      <div style="padding:28px 32px;">
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr><td style="padding:8px 0;color:#94a3b8;font-size:0.85rem;width:120px;">From</td><td style="color:#f1f5f9;font-weight:600;">${ticket.name} &lt;${ticket.email}&gt;</td></tr>
          ${ticket.company ? `<tr><td style="padding:8px 0;color:#94a3b8;font-size:0.85rem;">Company</td><td style="color:#f1f5f9;">${ticket.company}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#94a3b8;font-size:0.85rem;">Subject</td><td style="color:#f1f5f9;font-weight:600;">${ticket.subject}</td></tr>
          <tr><td style="padding:8px 0;color:#94a3b8;font-size:0.85rem;">Category</td><td><span style="background:rgba(0,212,200,0.15);color:#00d4c8;padding:2px 10px;border-radius:20px;font-size:0.8rem;">${ticket.category}</span></td></tr>
          <tr><td style="padding:8px 0;color:#94a3b8;font-size:0.85rem;">Ticket ID</td><td style="color:#64748b;font-size:0.8rem;">${ticket._id}</td></tr>
        </table>
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:20px;margin-bottom:24px;">
          <p style="margin:0;color:#f1f5f9;line-height:1.7;white-space:pre-wrap;">${ticket.message}</p>
        </div>
        <a href="${process.env.ADMIN_URL || 'http://localhost:3000/admin.html'}" style="display:inline-block;background:#00d4c8;color:#060a12;padding:12px 28px;border-radius:9px;text-decoration:none;font-weight:700;font-size:0.9rem;">Open Admin Dashboard →</a>
      </div>
    </div>`;
}

function userConfirmHtml(ticket) {
    return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0d1424;color:#f1f5f9;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#00d4c8,#0891b2);padding:24px 32px;">
        <h1 style="margin:0;font-size:1.3rem;color:#fff;">✅ We got your message!</h1>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:0.9rem;">SmartArch Support</p>
      </div>
      <div style="padding:28px 32px;">
        <p style="color:#f1f5f9;line-height:1.7;">Hi <strong>${ticket.name}</strong>,</p>
        <p style="color:#94a3b8;line-height:1.7;">Thanks for reaching out. We've received your message and will get back to you within <strong style="color:#00d4c8;">1–2 business days</strong>.</p>
        <div style="background:rgba(255,255,255,0.04);border-left:3px solid #00d4c8;padding:16px 20px;border-radius:0 8px 8px 0;margin:20px 0;">
          <p style="margin:0 0 4px;color:#94a3b8;font-size:0.78rem;text-transform:uppercase;letter-spacing:1px;">Your message</p>
          <p style="margin:0;color:#f1f5f9;font-style:italic;line-height:1.6;">${ticket.message.slice(0, 200)}${ticket.message.length > 200 ? '…' : ''}</p>
        </div>
        <p style="color:#64748b;font-size:0.8rem;">Ticket ID: <code style="color:#00d4c8;">${ticket._id}</code></p>
      </div>
    </div>`;
}

function adminReplyHtml(ticket, reply) {
    return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0d1424;color:#f1f5f9;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#00d4c8,#0891b2);padding:24px 32px;">
        <h1 style="margin:0;font-size:1.3rem;color:#fff;">💬 Reply from SmartArch Support</h1>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:0.9rem;">Re: ${ticket.subject}</p>
      </div>
      <div style="padding:28px 32px;">
        <p style="color:#f1f5f9;line-height:1.7;">Hi <strong>${ticket.name}</strong>,</p>
        <div style="background:rgba(0,212,200,0.06);border:1px solid rgba(0,212,200,0.18);border-radius:10px;padding:20px;margin:20px 0;">
          <p style="margin:0 0 8px;color:#00d4c8;font-size:0.8rem;font-weight:700;">SmartArch Team replied:</p>
          <p style="margin:0;color:#f1f5f9;line-height:1.7;white-space:pre-wrap;">${reply.message}</p>
        </div>
        <div style="border-top:1px solid rgba(255,255,255,0.08);margin-top:24px;padding-top:16px;">
          <p style="color:#64748b;font-size:0.8rem;margin:0;">Your original message:</p>
          <p style="color:#94a3b8;font-size:0.85rem;line-height:1.6;font-style:italic;margin:8px 0 0;">${ticket.message.slice(0, 200)}${ticket.message.length > 200 ? '…' : ''}</p>
        </div>
      </div>
    </div>`;
}

// ─── Public: Submit Contact Form ───────────────────────────────────────────────

exports.submitTicket = async (req, res) => {
    try {
        const { name, email, subject, category, message, company } = req.body;

        if (!name || !email || !subject || !category || !message) {
            return res.status(400).json({ success: false, message: 'All required fields must be filled.' });
        }
        if (message.length < 10) {
            return res.status(400).json({ success: false, message: 'Message must be at least 10 characters.' });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ success: false, message: 'Invalid email address.' });
        }

        // Link to user account if logged in
        let userId = null;
        if (req.user) userId = req.user._id;

        const ticket = await Ticket.create({ userId, name, email, company: company || '', subject, category, message });

        // Email admin
        const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
        if (adminEmail) {
            try {
                await sendEmail({ to: adminEmail, subject: `[SmartArch Support] New Ticket: ${subject}`, html: adminNotifyHtml(ticket) });
            } catch (e) { console.error('Admin email failed:', e.message); }
        }

        // Confirm to user
        try {
            await sendEmail({ to: email, subject: `We received your message — SmartArch Support`, html: userConfirmHtml(ticket) });
        } catch (e) { console.error('User confirm email failed:', e.message); }

        res.status(201).json({ success: true, message: 'Ticket submitted successfully.', ticketId: ticket._id });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── User: Get own tickets ─────────────────────────────────────────────────────

exports.getUserTickets = async (req, res) => {
    try {
        const tickets = await Ticket.find({ userId: req.user._id })
            .select('-__v')
            .sort({ createdAt: -1 });

        // Mark all as userRead
        await Ticket.updateMany({ userId: req.user._id, userRead: false }, { userRead: true });

        res.json({ success: true, tickets });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── User: Get unread count ────────────────────────────────────────────────────

exports.getUserUnreadCount = async (req, res) => {
    try {
        const count = await Ticket.countDocuments({ userId: req.user._id, userRead: false });
        res.json({ success: true, count });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── Admin: Get all tickets ────────────────────────────────────────────────────

exports.getAllTickets = async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const filter = {};
        if (status && status !== 'all') filter.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);
        const [tickets, total, newCount] = await Promise.all([
            Ticket.find(filter).select('-__v').sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
            Ticket.countDocuments(filter),
            Ticket.countDocuments({ status: 'new' })
        ]);

        res.json({ success: true, tickets, total, newCount });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── Admin: Get single ticket + mark seen ─────────────────────────────────────

exports.getTicket = async (req, res) => {
    try {
        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

        // Mark as seen if new
        if (ticket.status === 'new') {
            ticket.status = 'seen';
            ticket.adminRead = true;
            await ticket.save();
        } else if (!ticket.adminRead) {
            ticket.adminRead = true;
            await ticket.save();
        }

        res.json({ success: true, ticket });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── Admin: Reply to ticket ────────────────────────────────────────────────────

exports.replyToTicket = async (req, res) => {
    try {
        const { message } = req.body;
        if (!message || message.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Reply message is required.' });
        }

        const ticket = await Ticket.findById(req.params.id);
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

        const reply = {
            sender: 'admin',
            senderName: req.user.name || 'SmartArch Support',
            senderEmail: req.user.email,
            message: message.trim()
        };

        ticket.replies.push(reply);
        ticket.status = 'replied';
        ticket.adminRead = true;
        ticket.userRead = false; // notify user
        await ticket.save();

        // Email the user
        try {
            await sendEmail({
                to: ticket.email,
                subject: `Re: ${ticket.subject} — SmartArch Support`,
                html: adminReplyHtml(ticket, reply)
            });
        } catch (e) { console.error('Reply email failed:', e.message); }

        res.json({ success: true, message: 'Reply sent.', ticket });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── Admin: Update ticket status ───────────────────────────────────────────────

exports.updateTicketStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const allowed = ['new', 'seen', 'replied', 'closed'];
        if (!allowed.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status.' });
        }

        const ticket = await Ticket.findByIdAndUpdate(req.params.id, { status }, { new: true });
        if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

        res.json({ success: true, ticket });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── Admin: Unread count ───────────────────────────────────────────────────────

exports.getAdminUnreadCount = async (req, res) => {
    try {
        const count = await Ticket.countDocuments({ status: 'new' });
        res.json({ success: true, count });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error.' });
    }
};