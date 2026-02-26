// backend/models/ModelVersion.js
const mongoose = require('mongoose');

const modelVersionSchema = new mongoose.Schema({
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    version: { type: Number, required: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    thumbnail: { type: String },
    exportFormats: { obj: String, stl: String, gltf: String, pdf: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    changeLog: { type: String, trim: true }
}, { timestamps: true });

modelVersionSchema.index({ project: 1, version: -1 });

module.exports = mongoose.model('ModelVersion', modelVersionSchema);
