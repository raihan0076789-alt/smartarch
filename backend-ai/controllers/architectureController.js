/**
 * architectureController.js
 * API layer — Building Layout endpoints + AI chat proxy + Export endpoints.
 */

import { architectureService }                  from '../services/architectureService.js';
import { generateDXF, generateOBJ, generateSTL, generateGLB } from '../services/exportService.js';
import logger                                   from '../utils/logger.js';
import { v4 as uuidv4 }                         from 'uuid';

// ─────────────────────────────────────────────
//  POST /api/architecture/floorplan/generate
// ─────────────────────────────────────────────
export const generateFloorplan = async (req, res, next) => {
  const requestId = uuidv4();
  try {
    logger.info(`[${requestId}] generateFloorplan request`);
    const { buildingType, floors, totalArea, rooms } = req.body;

    if (floors !== undefined && (isNaN(floors) || floors < 1 || floors > 6))
      return res.status(400).json({ error:'Bad Request', message:'floors must be between 1 and 6', requestId });
    if (totalArea !== undefined && (isNaN(totalArea) || totalArea < 20))
      return res.status(400).json({ error:'Bad Request', message:'totalArea must be at least 20 m²', requestId });

    const params = {
      buildingType: buildingType || 'residential',
      floors:       parseInt(floors || 1, 10),
      totalArea:    parseFloat(totalArea || 100),
      rooms:        Array.isArray(rooms) ? rooms : [],
    };
    const floorplan = architectureService.generateFloorplan(params, requestId);
    logger.info(`[${requestId}] Floorplan generated — ${floorplan.floors.length} floor(s)`);
    return res.status(200).json({ success:true, requestId, floorplan, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error(`[${requestId}] Error in generateFloorplan:`, error);
    next(error);
  }
};

// ─────────────────────────────────────────────
//  POST /api/architecture/floorplan/upload-image
// ─────────────────────────────────────────────
export const uploadFloorplanImage = async (req, res, next) => {
  const requestId = uuidv4();
  try {
    logger.info(`[${requestId}] uploadFloorplanImage request`);
    if (!req.file || !req.file.buffer)
      return res.status(400).json({ error:'Bad Request', message:'An image file is required (field name: file)', requestId });

    const scaleFactor = parseFloat(req.body.scaleFactor) || 20;
    const floorplan   = await architectureService.parseFloorplanImage(req.file.buffer, scaleFactor, requestId);
    logger.info(`[${requestId}] Image floorplan extracted — ${floorplan.floors[0]?.rooms?.length} room(s)`);
    return res.status(200).json({ success:true, requestId, floorplan, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error(`[${requestId}] Error in uploadFloorplanImage:`, error);
    next(error);
  }
};

// ─────────────────────────────────────────────
//  POST /api/architecture/chat
//  Body: { message, projectData? }
// ─────────────────────────────────────────────
export const chatWithArchitect = async (req, res, next) => {
  const requestId = uuidv4();
  try {
    const { message, projectData, history = [] } = req.body;
    if (!message || !message.trim())
      return res.status(400).json({ error: 'Message is required', requestId });

    const systemPrompt = buildSystemPrompt(projectData);
    const reply = await architectureService.callLlamaAPI(systemPrompt, message, requestId, history);
    return res.status(200).json({ success: true, requestId, data: { reply }, timestamp: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
};

// ─────────────────────────────────────────────
//  POST /api/architecture/suggest
//  Body: { type: 'interior'|'exterior'|'layout'|'materials', projectData }
// ─────────────────────────────────────────────
export const suggestDesign = async (req, res, next) => {
  const requestId = uuidv4();
  try {
    const { type = 'interior', projectData } = req.body;
    if (!projectData || !Array.isArray(projectData.floors))
      return res.status(400).json({ error: 'Bad Request', message: 'projectData with floors array is required', requestId });

    const systemPrompt = buildSystemPrompt(projectData);
    const userPrompt   = buildSuggestionPrompt(type, projectData);
    logger.info(`[${requestId}] suggestDesign — type: ${type}`);

    const reply = await architectureService.callLlamaAPI(systemPrompt, userPrompt, requestId);
    return res.status(200).json({ success: true, requestId, type, data: { reply }, timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error(`[${requestId}] Error in suggestDesign:`, error);
    next(error);
  }
};

// ─────────────────────────────────────────────
//  Prompt builders
// ─────────────────────────────────────────────

function buildSystemPrompt(pd) {
  if (!pd) {
    return `You are SmartArch AI, an expert architectural design assistant specialising in residential and commercial buildings.
Provide specific, actionable advice on floor layouts, interior design, exterior finishes, materials, lighting, and space planning.
Be concise, practical, and use metric units. Structure answers clearly with short paragraphs or bullet points.`;
  }

  const floors      = pd.floors || [];
  const allRooms    = floors.flatMap(f => f.rooms || []);
  const totalRooms  = allRooms.length;
  const totalArea   = (pd.totalWidth * pd.totalDepth * floors.length).toFixed(0);
  const doorCount   = allRooms.reduce((s, r) => s + (r.doors   || []).length, 0);
  const winCount    = allRooms.reduce((s, r) => s + (r.windows || []).length, 0);
  const roofType    = pd.specifications?.roofType || 'pitched';
  const style       = pd.style || 'modern';

  const styleDescs = {
    modern:      'contemporary — clean lines, concrete & glass, minimalist fixtures',
    minimalist:  'pure whites, maximum natural light, clutter-free open spaces',
    traditional: 'warm brick & oak, classical mouldings, cosy character',
    luxury:      'marble surfaces, gold accents, high ceilings, bespoke fittings',
  };

  const floorSummary = floors.map((f, i) =>
    `  Floor ${i + 1} — "${f.name || `Level ${i + 1}`}", ${f.height || 2.7}m ceiling, ` +
    `${(f.rooms || []).length} rooms: ${(f.rooms || []).map(r => `${r.name} (${r.type}, ${r.width}×${r.depth}m)`).join(', ') || 'none'}`
  ).join('\n');

  return `You are SmartArch AI, an expert architectural design assistant with deep knowledge of interior design, exterior architecture, structural systems, materials, lighting, and space planning.

## Current Project: "${pd.name || 'Untitled Project'}"

### Building
- Footprint: ${pd.totalWidth}m × ${pd.totalDepth}m  (${totalArea} m² gross)
- Style: ${style} — ${styleDescs[style] || style}
- Roof: ${roofType}
- Building type: ${pd.type || 'residential'}
- Total rooms: ${totalRooms}  |  Doors placed: ${doorCount}  |  Windows placed: ${winCount}

### Floor Breakdown
${floorSummary || '  No floors defined.'}

### Materials Specified
- Exterior walls: ${pd.materials?.exterior?.walls || 'not yet specified'}
- Roof cladding: ${pd.materials?.exterior?.roof   || 'not yet specified'}
- Interior flooring: ${pd.materials?.interior?.flooring  || 'not yet specified'}
- Interior ceilings: ${pd.materials?.interior?.ceilings  || 'not yet specified'}

## Instructions
You have full knowledge of every room, dimension, floor, and material choice in this project.
Always ground your answers in the actual data above — reference specific room names, real dimensions, and the chosen style.
When a user asks a question or needs suggestions, be specific and practical. Use metric units.
Never give generic advice that ignores the project — always tie suggestions to the actual rooms and sizes listed.
Format responses with short paragraphs or numbered/bulleted lists for readability.`;
}

function buildSuggestionPrompt(type, pd) {
  const floors   = pd.floors || [];
  const allRooms = floors.flatMap(f => f.rooms || []);
  const style    = pd.style || 'modern';
  const roofType = pd.specifications?.roofType || 'pitched';

  const prompts = {
    interior: `Analyse this project and provide 5 specific interior design suggestions.
For each suggestion: name the exact room(s) it applies to, describe the change, and explain why it suits the ${style} style and the room's dimensions.
Cover: colour palettes, furniture arrangement for actual room sizes, lighting types, flooring transitions, storage, and soft furnishings.
Number each point. Be concrete — reference real room names and measurements from the project.`,

    exterior: `Analyse this project (${pd.totalWidth}×${pd.totalDepth}m, ${style} style, ${roofType} roof) and provide 5 specific exterior design suggestions.
Cover: facade cladding/texture, window sizing and placement relative to actual rooms, entrance treatment, roof details, landscaping for this footprint, and exterior lighting.
Number each point. Reference the actual building dimensions and ${style} aesthetic throughout.`,

    layout: `Critically analyse the current room layout and provide 5 specific improvement suggestions.
Current rooms: ${allRooms.map(r => `${r.name} (${r.width}×${r.depth}m)`).join(', ') || 'none placed yet'}.
Consider: traffic flow, room adjacency logic, proportions, natural light, circulation efficiency, and missing rooms for a ${pd.type || 'residential'} building.
Number each point. Explain the reasoning tied to the specific room names and sizes above.`,

    materials: `Based on the ${style} style and specific rooms in this project, recommend materials and finishes.
Rooms: ${allRooms.map(r => r.name).join(', ') || 'none placed yet'}.
For each main zone (living areas, kitchen, wet rooms, bedrooms, exterior facade), specify: flooring material, wall finish, ceiling treatment, and key fixtures — all matched to the ${style} aesthetic and each room's practical requirements.
Number each zone. Be specific with product types and finishes.`,
  };

  return prompts[type] || prompts.interior;
}


// ─────────────────────────────────────────────
//  POST /api/architecture/export/cad  → .dxf
// ─────────────────────────────────────────────
export const exportCAD = async (req, res, next) => {
  const requestId = uuidv4();
  try {
    const pd = req.body;
    if (!pd || !Array.isArray(pd.floors))
      return res.status(400).json({ error:'Bad Request', message:'projectData with floors array is required', requestId });

    const dxf      = generateDXF(pd);
    const filename = safeName(pd.name) + '.dxf';
    logger.info(`[${requestId}] DXF generated — ${dxf.length} chars`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.send(dxf);
  } catch (error) {
    logger.error(`[${requestId}] Error in exportCAD:`, error);
    next(error);
  }
};

// ─────────────────────────────────────────────
//  POST /api/architecture/export/obj  → .zip (obj + mtl)
//  Returns a plain-text multipart-like response with boundary.
//  Simpler: return JSON { obj, mtl } and let frontend handle saving both files.
// ─────────────────────────────────────────────
export const exportOBJ = async (req, res, next) => {
  const requestId = uuidv4();
  try {
    const pd = req.body;
    if (!pd || !Array.isArray(pd.floors))
      return res.status(400).json({ error:'Bad Request', message:'projectData with floors array is required', requestId });

    const { obj, mtl } = generateOBJ(pd);
    const base = safeName(pd.name);
    logger.info(`[${requestId}] OBJ generated — ${obj.length} chars`);
    res.status(200).json({ success:true, obj, mtl, filename: base });
  } catch (error) {
    logger.error(`[${requestId}] Error in exportOBJ:`, error);
    next(error);
  }
};

// ─────────────────────────────────────────────
//  POST /api/architecture/export/stl  → .stl (binary)
// ─────────────────────────────────────────────
export const exportSTL = async (req, res, next) => {
  const requestId = uuidv4();
  try {
    const pd = req.body;
    if (!pd || !Array.isArray(pd.floors))
      return res.status(400).json({ error:'Bad Request', message:'projectData with floors array is required', requestId });

    const stl      = generateSTL(pd);
    const filename = safeName(pd.name) + '.stl';
    logger.info(`[${requestId}] STL generated — ${stl.length} bytes`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.send(stl);
  } catch (error) {
    logger.error(`[${requestId}] Error in exportSTL:`, error);
    next(error);
  }
};

// ─────────────────────────────────────────────
//  POST /api/architecture/export/gltf  → .glb (binary glTF 2.0)
// ─────────────────────────────────────────────
export const exportGLTF = async (req, res, next) => {
  const requestId = uuidv4();
  try {
    const pd = req.body;
    if (!pd || !Array.isArray(pd.floors))
      return res.status(400).json({ error:'Bad Request', message:'projectData with floors array is required', requestId });

    const glb      = generateGLB(pd);
    const filename = safeName(pd.name) + '.glb';
    logger.info(`[${requestId}] GLB generated — ${glb.length} bytes`);
    res.setHeader('Content-Type', 'model/gltf-binary');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.send(glb);
  } catch (error) {
    logger.error(`[${requestId}] Error in exportGLTF:`, error);
    next(error);
  }
};

// ─────────────────────────────────────────────
//  Utility
// ─────────────────────────────────────────────
function safeName(name) {
  return (name || 'project').replace(/[^a-z0-9_\-\s]/gi, '_').trim();
}