// backend-main/controllers/feedbackController.js
// Stores and retrieves the AI feedback payload on a project document.
// All AI computation happens in backend-ai; this controller only persists results.

const Project = require('../models/Project');

// PUT /api/projects/:id/ai-feedback
// Body: { feedback } — the object returned by backend-ai POST /api/architecture/feedback
exports.saveAIFeedback = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Only the owner or an editor-level collaborator may save feedback
        const isOwner = project.owner.equals(req.user.id);
        const isEditor = project.collaborators.some(
            c => c.user.equals(req.user.id) && ['editor', 'admin'].includes(c.role)
        );
        if (!isOwner && !isEditor) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this project' });
        }

        const { feedback } = req.body;
        if (!feedback || typeof feedback !== 'object') {
            return res.status(400).json({ success: false, message: 'feedback object is required' });
        }

        // Persist using $set so no other project fields are touched
        await Project.findByIdAndUpdate(
            req.params.id,
            { $set: { aiFeedback: feedback } },
            { runValidators: false }
        );

        res.json({ success: true, message: 'AI feedback saved', aiFeedback: feedback });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// GET /api/projects/:id/ai-feedback
exports.getAIFeedback = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id).select('aiFeedback owner collaborators isPublic');
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const hasAccess =
            project.owner.equals(req.user.id) ||
            project.collaborators.some(c => c.user.equals(req.user.id)) ||
            project.isPublic;

        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        res.json({ success: true, aiFeedback: project.aiFeedback || null });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};