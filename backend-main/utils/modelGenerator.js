// backend/utils/modelGenerator.js

function generateFloorPlanData(project) {
    const { totalWidth, totalDepth, floors } = project;
    const rooms = [];
    floors.forEach(floor => {
        floor.rooms.forEach(room => {
            rooms.push({
                name: room.name, type: room.type,
                width: room.width, depth: room.depth,
                x: room.x, z: room.z,
                floor: floor.level,
                area: room.width * room.depth,
                features: room.features || []
            });
        });
    });
    return {
        project: { name: project.name, type: project.type, totalWidth, totalDepth, totalArea: totalWidth * totalDepth },
        floors: floors.map(floor => ({
            level: floor.level, name: floor.name, height: floor.height,
            roomCount: floor.rooms.length,
            floorArea: floor.rooms.reduce((sum, r) => sum + r.width * r.depth, 0)
        })),
        rooms
    };
}

function generate3DModelData(project) {
    const { totalWidth, totalDepth, floors } = project;
    const meshes = [];
    floors.forEach(floor => {
        floor.rooms.forEach(room => {
            meshes.push({
                id: `room_${room.name.replace(/\s+/g, '_')}`,
                name: room.name, type: room.type,
                position: { x: room.x, y: floor.height * floor.level, z: room.z },
                dimensions: { width: room.width, height: room.height, depth: room.depth },
                floorMaterial: room.floorMaterial || 'wood',
                wallMaterial: room.wallMaterial || 'paint'
            });
        });
    });
    meshes.push({ id: 'exterior', type: 'exterior', dimensions: { width: totalWidth, height: 3, depth: totalDepth } });
    return {
        project: { name: project.name, type: project.type, totalWidth, totalDepth, floorCount: floors.length },
        meshes,
        metadata: { totalVertices: meshes.length * 24, totalFaces: meshes.length * 12, totalArea: totalWidth * totalDepth }
    };
}

module.exports = { generateFloorPlanData, generate3DModelData };
