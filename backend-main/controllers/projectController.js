// backend/controllers/projectController.js
const Project = require('../models/Project');
const ModelVersion = require('../models/ModelVersion');

exports.createProject = async (req, res) => {
    try {
        req.body.owner = req.user.id;
        req.body.lastModifiedBy = req.user.id;

        const project = await Project.create(req.body);

        await ModelVersion.create({
            project: project._id,
            version: 1,
            data: project.toObject(),
            createdBy: req.user.id,
            changeLog: 'Initial project creation'
        });

        res.status(201).json({ success: true, data: project });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getProjects = async (req, res) => {
    try {
        const { page = 1, limit = 50, status, type, sort = '-updatedAt' } = req.query;

        const query = {
            $or: [
                { owner: req.user.id },
                { 'collaborators.user': req.user.id }
            ]
        };

        if (status) query.status = status;
        if (type) query.type = type;

        const projects = await Project.find(query)
            .populate('owner', 'name email')
            .populate('collaborators.user', 'name email')
            .sort(sort)
            .skip((page - 1) * limit)
            .limit(parseInt(limit));

        const total = await Project.countDocuments(query);

        res.json({
            success: true,
            data: projects,
            pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('owner', 'name email')
            .populate('collaborators.user', 'name email')
            .populate('lastModifiedBy', 'name email');

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const hasAccess = project.owner._id.equals(req.user.id) ||
            project.collaborators.some(c => c.user._id.equals(req.user.id)) ||
            project.isPublic;

        if (!hasAccess) {
            return res.status(403).json({ success: false, message: 'Not authorized to access this project' });
        }

        res.json({ success: true, data: project });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.updateProject = async (req, res) => {
    try {
        let project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const isOwner = project.owner.equals(req.user.id);
        const isEditor = project.collaborators.some(
            c => c.user.equals(req.user.id) && ['editor', 'admin'].includes(c.role)
        );

        if (!isOwner && !isEditor) {
            return res.status(403).json({ success: false, message: 'Not authorized to update this project' });
        }

        req.body.lastModifiedBy = req.user.id;
        req.body.version = project.version + 1;

        project = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });

        await ModelVersion.create({
            project: project._id,
            version: project.version,
            data: project.toObject(),
            createdBy: req.user.id,
            changeLog: req.body.changeLog || 'Project updated'
        });

        res.json({ success: true, data: project });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.deleteProject = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        if (!project.owner.equals(req.user.id)) {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this project' });
        }

        await project.deleteOne();
        await ModelVersion.deleteMany({ project: req.params.id });

        res.json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.addCollaborator = async (req, res) => {
    try {
        const { email, role } = req.body;
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        if (!project.owner.equals(req.user.id)) {
            return res.status(403).json({ success: false, message: 'Only owner can add collaborators' });
        }

        const User = require('../models/User');
        const userToAdd = await User.findOne({ email });

        if (!userToAdd) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const alreadyCollaborator = project.collaborators.some(c => c.user.equals(userToAdd._id));
        if (alreadyCollaborator) {
            return res.status(400).json({ success: false, message: 'User is already a collaborator' });
        }

        project.collaborators.push({ user: userToAdd._id, role: role || 'viewer' });
        await project.save();
        res.json({ success: true, data: project });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getProjectVersions = async (req, res) => {
    try {
        const versions = await ModelVersion.find({ project: req.params.id })
            .populate('createdBy', 'name email')
            .sort('-version');
        res.json({ success: true, data: versions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.restoreVersion = async (req, res) => {
    try {
        const version = await ModelVersion.findById(req.params.versionId);
        if (!version) {
            return res.status(404).json({ success: false, message: 'Version not found' });
        }

        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        project.set(version.data);
        project.version += 1;
        project.lastModifiedBy = req.user.id;
        await project.save();

        await ModelVersion.create({
            project: project._id,
            version: project.version,
            data: project.toObject(),
            createdBy: req.user.id,
            changeLog: `Restored from version ${version.version}`
        });

        res.json({ success: true, data: project });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
