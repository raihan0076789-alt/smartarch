/**
 * exportService.js  —  SmartArch Export Engine  (v3 — full rewrite)
 *
 * Exports:
 *   generateDXF(projectData)  → string   (ASCII DXF, AutoCAD R2000)
 *   generateOBJ(projectData)  → { obj: string, mtl: string }
 *   generateSTL(projectData)  → Buffer   (binary STL)
 *   generateGLB(projectData)  → Buffer   (binary glTF 2.0)
 *
 * Geometry model:
 *   – Foundation slab
 *   – Per floor: outer walls (4), ceiling slab, inter-floor slab
 *   – Per room:  floor tile, interior partition walls (non-edge only)
 *   – Per room:  door frames + door panels, window frames + glass panes
 *   – Staircase steps (multi-floor)
 *   – Roof: flat / hip (tapered slabs) / gable (rotated panels + gable ends)
 *
 * All units are metres. Non-indexed geometry (expanded triangles) throughout
 * — avoids all index-buffer padding/alignment bugs.
 */

// ─────────────────────────────────────────────────────────────
//  Material catalogue
// ─────────────────────────────────────────────────────────────
const MATERIALS = {
  structure:      { r:0.53, g:0.54, b:0.55, a:1.0, rough:0.80, metal:0.00, name:'mat_structure'      },
  walls:          { r:0.76, g:0.71, b:0.63, a:1.0, rough:0.85, metal:0.00, name:'mat_walls'          },
  interior_walls: { r:0.88, g:0.85, b:0.80, a:1.0, rough:0.85, metal:0.00, name:'mat_interior_walls' },
  floors:         { r:0.55, g:0.48, b:0.38, a:1.0, rough:0.60, metal:0.00, name:'mat_floors'         },
  roof:           { r:0.25, g:0.28, b:0.32, a:1.0, rough:0.75, metal:0.05, name:'mat_roof'           },
  stairs:         { r:0.45, g:0.42, b:0.38, a:1.0, rough:0.70, metal:0.00, name:'mat_stairs'         },
  door_frame:     { r:0.30, g:0.22, b:0.14, a:1.0, rough:0.65, metal:0.05, name:'mat_door_frame'     },
  door_panel:     { r:0.20, g:0.16, b:0.12, a:1.0, rough:0.70, metal:0.00, name:'mat_door_panel'     },
  window_frame:   { r:0.20, g:0.20, b:0.22, a:1.0, rough:0.50, metal:0.15, name:'mat_window_frame'   },
  window_glass:   { r:0.53, g:0.80, b:0.95, a:0.4, rough:0.05, metal:0.10, name:'mat_window_glass'   },
};

// ─────────────────────────────────────────────────────────────
//  Geometry primitives
// ─────────────────────────────────────────────────────────────

/** 12 CCW triangles for an axis-aligned box centred at (cx,cy,cz). */
function boxTris(cx, cy, cz, w, h, d) {
  const x0=cx-w/2, x1=cx+w/2, y0=cy-h/2, y1=cy+h/2, z0=cz-d/2, z1=cz+d/2;
  return [
    {n:[0,0,-1], t:[[x0,y0,z0],[x1,y1,z0],[x1,y0,z0]]},
    {n:[0,0,-1], t:[[x0,y0,z0],[x0,y1,z0],[x1,y1,z0]]},
    {n:[0,0, 1], t:[[x1,y0,z1],[x1,y1,z1],[x0,y0,z1]]},
    {n:[0,0, 1], t:[[x0,y0,z1],[x1,y1,z1],[x0,y1,z1]]},
    {n:[-1,0,0], t:[[x0,y0,z1],[x0,y1,z0],[x0,y0,z0]]},
    {n:[-1,0,0], t:[[x0,y0,z1],[x0,y1,z1],[x0,y1,z0]]},
    {n:[ 1,0,0], t:[[x1,y0,z0],[x1,y1,z1],[x1,y0,z1]]},
    {n:[ 1,0,0], t:[[x1,y0,z0],[x1,y1,z0],[x1,y1,z1]]},
    {n:[0, 1,0], t:[[x0,y1,z0],[x0,y1,z1],[x1,y1,z0]]},
    {n:[0, 1,0], t:[[x1,y1,z0],[x0,y1,z1],[x1,y1,z1]]},
    {n:[0,-1,0], t:[[x0,y0,z1],[x0,y0,z0],[x1,y0,z0]]},
    {n:[0,-1,0], t:[[x0,y0,z1],[x1,y0,z0],[x1,y0,z1]]},
  ];
}

/** Rotate [x,y,z] around Z-axis by `a` radians, pivot at (px,py). */
function rzPoint(x, y, z, a, px=0, py=0) {
  const c=Math.cos(a), s=Math.sin(a), rx=x-px, ry=y-py;
  return [px+rx*c-ry*s, py+rx*s+ry*c, z];
}

/** Rotated-box triangles for a gable roof slope. */
function gableSlopeTris(cx, cy, cz, pitchLen, thick, depth, angle, side) {
  return boxTris(cx, cy, cz, pitchLen, thick, depth).map(tri => {
    const tv = tri.t.map(([x,y,z]) => rzPoint(x,y,z, side*-angle, cx, cy));
    const [nx,ny,nz]=tri.n, c=Math.cos(side*-angle), s=Math.sin(side*-angle);
    const len=Math.sqrt((nx*c-ny*s)**2+(nx*s+ny*c)**2+nz**2)||1;
    return {n:[(nx*c-ny*s)/len,(nx*s+ny*c)/len,nz/len], t:tv};
  });
}

/** Single triangle for a gable-end face. */
function gableEndTri(x0, x1, baseY, peakY, peakX, z, nz) {
  return [{n:[0,0,nz], t:[[x0,baseY,z],[peakX,peakY,z],[x1,baseY,z]]}];
}

// ─────────────────────────────────────────────────────────────
//  Building geometry collector
//  Returns [{ material: string, tris: [{n,t},...] }, ...]
// ─────────────────────────────────────────────────────────────
function collectGeometry(pd) {
  const W  = pd.totalWidth  || 20;
  const D  = pd.totalDepth  || 15;
  const FL = pd.floors      || [];
  const dFH = FL[0]?.height || 2.7;
  const roofType = pd.specifications?.roofType || 'pitched';
  const wt = 0.22;
  const out = [];

  const push = (mat, tris) => out.push({material: mat, tris});

  push('structure', boxTris(0, -0.1, 0, W+0.6, 0.2, D+0.6));

  let baseY = 0;
  FL.forEach((floor, fi) => {
    const fH = floor.height || dFH;
    const ox = -W/2, oz = -D/2;

    if (fi > 0) push('structure', boxTris(0, baseY-0.125, 0, W+0.1, 0.25, D+0.1));
    push('structure', boxTris(0, baseY+fH-0.06, 0, W, 0.12, D));

    [{w:W,  d:wt, x:0,           z:oz+wt/2    },
     {w:W,  d:wt, x:0,           z:oz+D-wt/2  },
     {w:wt, d:D,  x:ox+wt/2,     z:0          },
     {w:wt, d:D,  x:ox+W-wt/2,   z:0          }
    ].forEach(({w,d,x,z}) => push('walls', boxTris(x, baseY+fH/2, z, w, fH, d)));

    (floor.rooms || []).forEach(room => {
      const cx  = ox + room.x + room.width/2;
      const cz2 = oz + room.z + room.depth/2;
      const rH  = room.height || fH;

      push('floors', boxTris(cx, baseY+0.04, cz2, room.width-0.02, 0.08, room.depth-0.02));

      [{w:room.width,  d:0.1, x:cx, z:oz+room.z,              edge:room.z<=0.01},
       {w:room.width,  d:0.1, x:cx, z:oz+room.z+room.depth,   edge:room.z+room.depth>=D-0.01},
       {w:0.1, d:room.depth,  x:ox+room.x,             z:cz2, edge:room.x<=0.01},
       {w:0.1, d:room.depth,  x:ox+room.x+room.width,  z:cz2, edge:room.x+room.width>=W-0.01}
      ].forEach(({w,d,x,z,edge}) => {
        if (!edge) push('interior_walls', boxTris(x, baseY+rH/2, z, w, rH, d));
      });

      (room.doors || []).forEach(door => {
        const dH=2.1, dW=door.width||0.9, pos=door.pos??0.5;
        const isH = door.wall==='top'||door.wall==='bottom';
        let dx, dz;
        switch(door.wall){
          case 'top':    dx=ox+room.x+pos*room.width; dz=oz+room.z;             break;
          case 'bottom': dx=ox+room.x+pos*room.width; dz=oz+room.z+room.depth;  break;
          case 'left':   dx=ox+room.x;                dz=oz+room.z+pos*room.depth; break;
          default:       dx=ox+room.x+room.width;     dz=oz+room.z+pos*room.depth;
        }
        const fW=isH?dW+0.16:wt+0.06, fD=isH?wt+0.06:dW+0.16;
        push('door_frame', boxTris(dx, baseY+dH+0.05, dz, fW, 0.1, fD));
        [-1,1].forEach(s => {
          const upW=isH?0.09:fW, upD=isH?fD:0.09;
          push('door_frame', boxTris(
            dx+(isH?s*(dW/2+0.045):0), baseY+dH/2,
            dz+(isH?0:s*(dW/2+0.045)), upW, dH, upD));
        });
        const pW=isH?dW-0.05:0.06, pD=isH?0.06:dW-0.05, oa=0.42;
        const pvX=dx+(isH?-(dW/2-0.03):0), pvZ=dz+(isH?0:-(dW/2-0.03));
        push('door_panel', boxTris(
          pvX+(isH?(dW/2-0.03)*Math.cos(oa):0), baseY+dH/2,
          pvZ+(isH?(dW/2-0.03)*Math.sin(oa):(dW/2-0.03)*Math.cos(oa)),
          pW, dH-0.06, pD));
      });

      (room.windows || []).forEach(win => {
        const wH=1.1, wW=win.width||1.0, wY=baseY+fH*0.55, pos=win.pos??0.5;
        const isH2 = win.wall==='top'||win.wall==='bottom';
        let wx2, wz2;
        switch(win.wall){
          case 'top':    wx2=ox+room.x+pos*room.width; wz2=oz+room.z;             break;
          case 'bottom': wx2=ox+room.x+pos*room.width; wz2=oz+room.z+room.depth;  break;
          case 'left':   wx2=ox+room.x;                wz2=oz+room.z+pos*room.depth; break;
          default:       wx2=ox+room.x+room.width;     wz2=oz+room.z+pos*room.depth;
        }
        const fW2=isH2?wW+0.12:wt+0.06, fD2=isH2?wt+0.06:wW+0.12;
        [-1,1].forEach(s => push('window_frame', boxTris(wx2, wY+s*(wH/2+0.035), wz2, fW2, 0.07, fD2)));
        [-1,1].forEach(s => {
          push('window_frame', boxTris(
            wx2+(isH2?s*(wW/2+0.035):0), wY,
            wz2+(isH2?0:s*(wW/2+0.035)),
            isH2?0.07:fW2, wH, isH2?fD2:0.07));
        });
        push('window_glass', boxTris(wx2, wY, wz2, isH2?wW-0.08:wt*0.35, wH-0.1, isH2?wt*0.35:wW-0.08));
      });
    });

    if (FL.length > 1 && fi < FL.length-1) {
      const sc=Math.max(8,Math.ceil(fH/0.18)), sH=fH/sc, sD=0.28, sW=1.1;
      const sx=-W/2+0.5+sW/2, szb=-D/2+0.5;
      for (let i=0; i<sc; i++)
        push('stairs', boxTris(sx, baseY+sH/2+i*sH, szb+i*sD+sD/2, sW, sH, sD));
    }
    baseY += fH;
  });

  // Roof
  const totalH = FL.reduce((s,f)=>s+(f.height||dFH), 0);
  const overhang = 0.5;

  if (roofType === 'flat') {
    push('roof', boxTris(0, totalH+0.15, 0, W+overhang*2, 0.3, D+overhang*2));
  } else if (roofType === 'hip') {
    const rh=Math.min(W,D)*0.35, steps=8;
    for (let i=0; i<steps; i++) {
      const t=i/steps, sh=rh/steps;
      push('roof', boxTris(0, totalH+t*rh+sh/2, 0,
        Math.max(0.1,(W+overhang*2)*(1-t)), sh, Math.max(0.1,(D+overhang*2)*(1-t))));
    }
  } else {
    // Gable
    const rh=Math.min(W,D)*0.35, halfW=W/2+overhang;
    const pLen=Math.sqrt(halfW*halfW+rh*rh), angle=Math.atan2(rh,halfW);
    push('roof', gableSlopeTris(-W/4, totalH+rh/2, 0, pLen, 0.22, D+overhang*2, angle, -1));
    push('roof', gableSlopeTris( W/4, totalH+rh/2, 0, pLen, 0.22, D+overhang*2, angle,  1));
    [-D/2-overhang, D/2+overhang].forEach((z, zi) =>
      push('roof', gableEndTri(-halfW, halfW, totalH, totalH+rh, 0, z, zi===0?-1:1)));
  }

  return out;
}

// ─────────────────────────────────────────────────────────────
//  DXF  (ASCII, AutoCAD R2000)
// ─────────────────────────────────────────────────────────────
export function generateDXF(pd) {
  const W=pd.totalWidth||20, D=pd.totalDepth||15, FL=pd.floors||[], M=1000;
  const lines=[];

  lines.push('0\nSECTION','2\nHEADER',
    '9\n$ACADVER','1\nAC1015','9\n$INSUNITS','70\n4',
    '9\n$EXTMIN',`10\n0`,`20\n0`,`30\n0`,
    '9\n$EXTMAX',`10\n${W*M}`,`20\n${D*M}`,`30\n0`,'0\nENDSEC');

  lines.push('0\nSECTION','2\nTABLES','0\nTABLE','2\nLAYER','70\n5');
  [{n:'ROOMS',c:5},{n:'DOORS',c:1},{n:'WINDOWS',c:4},{n:'LABELS',c:3},{n:'BOUNDARY',c:7}]
    .forEach(({n,c}) => lines.push('0\nLAYER',`2\n${n}`,'70\n0',`62\n${c}`,'6\nCONTINUOUS'));
  lines.push('0\nENDTAB','0\nENDSEC');

  lines.push('0\nSECTION','2\nENTITIES');
  lines.push('0\nLWPOLYLINE','8\nBOUNDARY','90\n4','70\n1',
    `10\n0`,`20\n0`,`10\n${W*M}`,`20\n0`,`10\n${W*M}`,`20\n${D*M}`,`10\n0`,`20\n${D*M}`);

  FL.forEach((floor, fi) => {
    (floor.rooms||[]).forEach(room => {
      const x1=room.x*M, y1=room.z*M, x2=(room.x+room.width)*M, y2=(room.z+room.depth)*M;
      lines.push('0\nLWPOLYLINE','8\nROOMS','90\n4','70\n1',
        `10\n${x1}`,`20\n${y1}`,`10\n${x2}`,`20\n${y1}`,`10\n${x2}`,`20\n${y2}`,`10\n${x1}`,`20\n${y2}`);
      const lx=(x1+x2)/2, ly=(y1+y2)/2;
      lines.push('0\nTEXT','8\nLABELS',`10\n${lx}`,`20\n${ly}`,`30\n0`,`40\n180`,
        `1\n${room.name||room.type} [F${fi+1}]`,'72\n1','73\n2',`11\n${lx}`,`21\n${ly}`);
      lines.push('0\nTEXT','8\nLABELS',`10\n${lx}`,`20\n${ly-220}`,`30\n0`,`40\n120`,
        `1\n${room.width}m x ${room.depth}m`,'72\n1','73\n2',`11\n${lx}`,`21\n${ly-220}`);

      (room.doors||[]).forEach(door => {
        const dw=(door.width||0.9)*M, pos=door.pos??0.5;
        let d1x,d1y,d2x,d2y;
        switch(door.wall){
          case'top':    d1x=x1+pos*(x2-x1)-dw/2;d1y=y1;d2x=d1x+dw;d2y=y1;break;
          case'bottom': d1x=x1+pos*(x2-x1)-dw/2;d1y=y2;d2x=d1x+dw;d2y=y2;break;
          case'left':   d1x=x1;d1y=y1+pos*(y2-y1)-dw/2;d2x=x1;d2y=d1y+dw;break;
          default:      d1x=x2;d1y=y1+pos*(y2-y1)-dw/2;d2x=x2;d2y=d1y+dw;
        }
        lines.push('0\nLINE','8\nDOORS',`10\n${d1x}`,`20\n${d1y}`,`11\n${d2x}`,`21\n${d2y}`);
      });

      (room.windows||[]).forEach(win => {
        const ww=(win.width||1.0)*M, pos=win.pos??0.5;
        let w1x,w1y,w2x,w2y;
        switch(win.wall){
          case'top':    w1x=x1+pos*(x2-x1)-ww/2;w1y=y1;w2x=w1x+ww;w2y=y1;break;
          case'bottom': w1x=x1+pos*(x2-x1)-ww/2;w1y=y2;w2x=w1x+ww;w2y=y2;break;
          case'left':   w1x=x1;w1y=y1+pos*(y2-y1)-ww/2;w2x=x1;w2y=w1y+ww;break;
          default:      w1x=x2;w1y=y1+pos*(y2-y1)-ww/2;w2x=x2;w2y=w1y+ww;
        }
        lines.push('0\nLINE','8\nWINDOWS',`10\n${w1x}`,`20\n${w1y}`,`11\n${w2x}`,`21\n${w2y}`);
      });
    });
  });

  lines.push('0\nENDSEC','0\nEOF');
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────
//  OBJ + MTL
// ─────────────────────────────────────────────────────────────
export function generateOBJ(pd) {
  const name   = (pd.name||'smartarch').replace(/\s+/g,'_');
  const groups = collectGeometry(pd);

  // MTL
  const mtlLines = [`# SmartArch MTL — ${name}`,`# Generated: ${new Date().toISOString()}`,``];
  [...new Set(groups.map(g=>g.material))].forEach(mk => {
    const m=MATERIALS[mk]; if(!m) return;
    mtlLines.push(`newmtl ${m.name}`,
      `Kd ${m.r.toFixed(4)} ${m.g.toFixed(4)} ${m.b.toFixed(4)}`,
      `Ka 0.1000 0.1000 0.1000`,
      `Ks ${(m.metal*0.5).toFixed(4)} ${(m.metal*0.5).toFixed(4)} ${(m.metal*0.5).toFixed(4)}`,
      `Ns ${((1-m.rough)*100).toFixed(1)}`, `d ${m.a.toFixed(4)}`, `illum 2`, ``);
  });

  // OBJ — unindexed, 3 verts per face
  const STOCK_NORMALS = [[0,0,-1],[0,0,1],[-1,0,0],[1,0,0],[0,1,0],[0,-1,0]];
  const nIdx = n => {
    let best=0, bd=-Infinity;
    STOCK_NORMALS.forEach(([ax,ay,az],i)=>{const d=ax*n[0]+ay*n[1]+az*n[2];if(d>bd){bd=d;best=i;}});
    return best+1;
  };

  const objLines = [
    `# SmartArch OBJ Export`,`# Project: ${pd.name||'Untitled'}`,
    `# Generated: ${new Date().toISOString()}`,`# Units: metres`,
    `mtllib ${name}.mtl`,``
  ];
  STOCK_NORMALS.forEach(([nx,ny,nz]) => objLines.push(`vn ${nx} ${ny} ${nz}`));
  objLines.push('');

  let vBase=1, lastMat=null, lastGroup=null;
  groups.forEach(({material, tris}) => {
    const m = MATERIALS[material];
    if (material!==lastGroup) { objLines.push(`g ${material}`); lastGroup=material; }
    if (m && m.name!==lastMat) { objLines.push(`usemtl ${m.name}`); lastMat=m.name; }
    tris.forEach(tri => {
      tri.t.forEach(([x,y,z]) => objLines.push(`v ${x.toFixed(5)} ${y.toFixed(5)} ${z.toFixed(5)}`));
      const ni=nIdx(tri.n);
      objLines.push(`f ${vBase}//${ni} ${vBase+1}//${ni} ${vBase+2}//${ni}`);
      vBase+=3;
    });
  });

  return { obj: objLines.join('\n'), mtl: mtlLines.join('\n') };
}

// ─────────────────────────────────────────────────────────────
//  STL  (binary)
// ─────────────────────────────────────────────────────────────
export function generateSTL(pd) {
  const tris = collectGeometry(pd).flatMap(g=>g.tris);
  const buf  = Buffer.alloc(84 + tris.length*50);
  const hdr  = `SmartArch STL | ${pd.name||'Project'} | ${new Date().toISOString()}`;
  for (let i=0; i<80; i++) buf[i] = i<hdr.length ? hdr.charCodeAt(i) : 0;
  buf.writeUInt32LE(tris.length, 80);
  let off=84;
  tris.forEach(tri => {
    buf.writeFloatLE(tri.n[0],off);   buf.writeFloatLE(tri.n[1],off+4);  buf.writeFloatLE(tri.n[2],off+8);  off+=12;
    tri.t.forEach(([x,y,z])=>{ buf.writeFloatLE(x,off); buf.writeFloatLE(y,off+4); buf.writeFloatLE(z,off+8); off+=12; });
    buf.writeUInt16LE(0,off); off+=2;
  });
  return buf;
}

// ─────────────────────────────────────────────────────────────
//  GLB  (binary glTF 2.0) — non-indexed, one mesh per material
// ─────────────────────────────────────────────────────────────
export function generateGLB(pd) {
  const groups = collectGeometry(pd);

  // Merge by material
  const byMat = {};
  groups.forEach(({material,tris}) => { if(!byMat[material]) byMat[material]=[]; byMat[material].push(...tris); });
  const matKeys = Object.keys(byMat);

  const binSegs=[], accessors=[], gltfMats=[], meshPrims=[], nodes=[];
  let binOffset=0;

  matKeys.forEach((mk, mi) => {
    const tris=byMat[mk], m=MATERIALS[mk]||{r:0.6,g:0.6,b:0.6,a:1,rough:0.8,metal:0,name:`mat_${mk}`};
    const count=tris.length*3;
    const pos=new Float32Array(count*3);
    let vi=0, minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
    tris.forEach(tri => tri.t.forEach(([x,y,z])=>{
      pos[vi++]=x; pos[vi++]=y; pos[vi++]=z;
      if(x<minX)minX=x; if(x>maxX)maxX=x;
      if(y<minY)minY=y; if(y>maxY)maxY=y;
      if(z<minZ)minZ=z; if(z>maxZ)maxZ=z;
    }));

    const seg=Buffer.from(pos.buffer);
    binSegs.push(seg);
    accessors.push({bufferView:mi,byteOffset:0,componentType:5126,count,type:'VEC3',
      min:[minX,minY,minZ],max:[maxX,maxY,maxZ]});
    gltfMats.push({name:m.name,
      pbrMetallicRoughness:{baseColorFactor:[m.r,m.g,m.b,m.a],metallicFactor:m.metal,roughnessFactor:m.rough},
      alphaMode:m.a<1?'BLEND':'OPAQUE', doubleSided:mk==='window_glass'});
    meshPrims.push({attributes:{POSITION:mi},material:mi,mode:4});
    nodes.push({name:mk,mesh:mi});
    binOffset+=seg.length;
  });

  // bufferViews — tightly packed, each segment already 4-byte aligned (Float32Array)
  const bufferViews=[];
  let bvOff=0;
  binSegs.forEach(seg => {
    bufferViews.push({buffer:0,byteOffset:bvOff,byteLength:seg.length,target:34962});
    bvOff+=seg.length;
  });

  const binRaw  = Buffer.concat(binSegs);
  const binPad  = binRaw.length%4===0 ? 0 : 4-(binRaw.length%4);
  const binData = Buffer.concat([binRaw, Buffer.alloc(binPad,0)]);

  const meshes = matKeys.map((k,i) => ({name:k,primitives:[meshPrims[i]]}));

  const gltfJson = {
    asset:{version:'2.0',generator:'SmartArch v3',copyright:pd.name||'SmartArch'},
    scene:0, scenes:[{name:'Scene',nodes:nodes.map((_,i)=>i)}],
    nodes, meshes, materials:gltfMats, accessors, bufferViews,
    buffers:[{byteLength:binData.length}],
  };

  const jsonStr  = JSON.stringify(gltfJson);
  const jsonPad  = jsonStr.length%4===0 ? 0 : 4-(jsonStr.length%4);
  const jsonData = Buffer.concat([Buffer.from(jsonStr,'utf8'), Buffer.alloc(jsonPad,0x20)]);

  const totalLen = 12 + 8+jsonData.length + 8+binData.length;
  const glb=Buffer.alloc(totalLen);
  let off=0;
  glb.writeUInt32LE(0x46546C67,off); off+=4;
  glb.writeUInt32LE(2,          off); off+=4;
  glb.writeUInt32LE(totalLen,   off); off+=4;
  glb.writeUInt32LE(jsonData.length,off); off+=4;
  glb.writeUInt32LE(0x4E4F534A, off); off+=4;
  jsonData.copy(glb,off); off+=jsonData.length;
  glb.writeUInt32LE(binData.length,off); off+=4;
  glb.writeUInt32LE(0x004E4942, off); off+=4;
  binData.copy(glb,off);
  return glb;
}