// SPDX-License-Identifier: MIT
export function drawStroke(ctx,stroke,width,height){
  ctx.save();ctx.globalCompositeOperation=stroke.tool==='eraser'?'destination-out':'source-over';ctx.strokeStyle=stroke.color;ctx.fillStyle=stroke.color;ctx.lineWidth=stroke.width*width/800;ctx.lineCap='round';ctx.lineJoin='round';
  const points=stroke.points;if(points.length===1){ctx.beginPath();ctx.arc(points[0][0]*width,points[0][1]*height,ctx.lineWidth/2,0,Math.PI*2);ctx.fill();}
  else{ctx.beginPath();ctx.moveTo(points[0][0]*width,points[0][1]*height);for(let i=1;i<points.length;i++)ctx.lineTo(points[i][0]*width,points[i][1]*height);ctx.stroke();}ctx.restore();
}
export function drawLayer(canvas,frame,width,height,draft=null){
  if(canvas.width!==width)canvas.width=width;if(canvas.height!==height)canvas.height=height;
  const ctx=canvas.getContext('2d');ctx.clearRect(0,0,width,height);for(const stroke of frame.strokes)drawStroke(ctx,stroke,width,height);if(draft)drawStroke(ctx,draft,width,height);return canvas;
}
export function drawPaper(canvas,frame,project,layer){
  if(canvas.width!==project.width)canvas.width=project.width;if(canvas.height!==project.height)canvas.height=project.height;
  const ctx=canvas.getContext('2d');ctx.fillStyle=project.background;ctx.fillRect(0,0,canvas.width,canvas.height);drawLayer(layer,frame,canvas.width,canvas.height);ctx.drawImage(layer,0,0);return canvas;
}
