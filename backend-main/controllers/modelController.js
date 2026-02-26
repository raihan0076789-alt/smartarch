// backend/controllers/modelController.js
const Project = require('../models/Project');
const { generateFloorPlanData, generate3DModelData } = require('../utils/modelGenerator');

exports.generateFloorPlan = async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        const floorPlanData = generateFloorPlanData(project);
        res.json({ success: true, data: floorPlanData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.generate3DModel = async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        const model3DData = generate3DModelData(project);
        res.json({ success: true, data: model3DData });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.exportModel = async (req, res) => {
    try {
        const { projectId, format } = req.params;
        const project = await Project.findById(projectId);

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        switch (format) {
            case 'json':
                res.setHeader('Content-Type', 'application/json');
                res.setHeader('Content-Disposition', `attachment; filename=${project.name}.json`);
                return res.send(JSON.stringify(project.toObject(), null, 2));

            case 'obj':
                res.setHeader('Content-Type', 'text/plain');
                res.setHeader('Content-Disposition', `attachment; filename=${project.name}.obj`);
                return res.send(generateOBJFile(project));

            case 'gltf':
                res.setHeader('Content-Type', 'model/gltf+json');
                res.setHeader('Content-Disposition', `attachment; filename=${project.name}.gltf`);
                return res.json(generateGLTFData(project));

            default:
                return res.status(400).json({ success: false, message: 'Invalid export format. Use: json, obj, or gltf' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getModelStats = async (req, res) => {
    try {
        const project = await Project.findById(req.params.projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        const stats = {
            totalArea: project.metadata.totalArea,
            totalRooms: project.metadata.totalRooms,
            totalFloors: project.metadata.totalFloors,
            roomBreakdown: {},
            estimatedCost: project.metadata.estimatedCost,
            constructionTime: project.metadata.constructionTime
        };

        project.floors.forEach(floor => {
            floor.rooms.forEach(room => {
                if (!stats.roomBreakdown[room.type]) {
                    stats.roomBreakdown[room.type] = { count: 0, totalArea: 0 };
                }
                stats.roomBreakdown[room.type].count += 1;
                stats.roomBreakdown[room.type].totalArea += room.width * room.depth;
            });
        });

        res.json({ success: true, data: stats });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

function generateOBJFile(project) {
    let obj = `# House Architect - ${project.name}\n# Generated on ${new Date().toISOString()}\n\n`;
    let vertexOffset = 0;

    project.floors.forEach((floor) => {
        floor.rooms.forEach(room => {
            const { width, depth, height, x, z } = room;
            const vertices = [
                [x, 0, z], [x + width, 0, z], [x + width, 0, z + depth], [x, 0, z + depth],
                [x, height, z], [x + width, height, z], [x + width, height, z + depth], [x, height, z + depth]
            ];
            vertices.forEach(v => { obj += `v ${v[0]} ${v[1]} ${v[2]}\n`; });
            const faces = [[1,2,6,5],[2,3,7,6],[3,4,8,7],[4,1,5,8],[1,2,3,4],[5,6,7,8]];
            obj += `o ${room.name}\n`;
            faces.forEach(face => { obj += `f ${face.map(v => v + vertexOffset).join(' ')}\n`; });
            vertexOffset += vertices.length;
        });
    });
    return obj;
}

function generateGLTFData(project) {
    return {
        asset: { version: "2.0", generator: "House Architect" },
        scene: 0,
        scenes: [{ name: "Scene", nodes: project.floors.flatMap(f => f.rooms.map((r, i) => i)) }],
        nodes: project.floors.flatMap(floor =>
            floor.rooms.map(room => ({
                name: room.name,
                translation: [room.x, 0, room.z],
                scale: [room.width, room.height, room.depth]
            }))
        ),
        meshes: []
    };
}
