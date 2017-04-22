
var max_dim = 100;
var canvas_x;
var canvas_y;
var frame_margin = 96;

var saved_col = 0
var saved_row = 0
var curr_row = 0
var curr_col = 0
var select_box = false;
var drag_pan = false;
var key_shift = false;
var scale_factor = 1;
var mouse_pix = {x: null, y: null};
var translate_x = 0;
var translate_y = 0;
var canvas_offset_x = 0;
var canvas_offset_y = 0;

var saved_floor_paths = new ClipperLib.Paths();
var solution_paths = new ClipperLib.Paths();
var current_path = new ClipperLib.Path();

var tool_selector;
var tool_mode = 'poly';

function ev_tool_change (evt) { 
	tool_mode = this.value;
} 

function init() {
	var canvas = document.getElementById('mapzone');
	var ctx = canvas.getContext('2d');
	canvas_x = canvas.width;
	canvas_y = canvas.height;
	
	canvas.addEventListener('mousedown',mousedown,false);
	canvas.addEventListener('mouseup',mouseup,false);
	canvas.addEventListener('mousemove',mousemove,false);
	canvas.addEventListener('contextmenu',contextmenu,false);
	canvas.addEventListener('mouseout', mouseout, false);
	canvas.addEventListener('DOMMouseScroll', mousewheel, false);
	
	tool_selector = document.getElementById('selector'); 
	tool_selector.addEventListener('change', ev_tool_change, false);
	
	var canvasRectangle = canvas.getBoundingClientRect();
	canvas_offset_x = canvasRectangle.left;
	canvas_offset_y = canvasRectangle.top;
	
	draw();
}

function draw_paths(ctx, paths)
{
	var ii, jj, x, y;
	ctx.beginPath();
	for(ii = 0; ii < paths.length; ii++) {
		for(jj = 0; jj < paths[ii].length; jj++) {
			x = paths[ii][jj].X;
			y = paths[ii][jj].Y;
			if (!jj) ctx.moveTo(x, y);
			else ctx.lineTo(x, y);
		}
		ctx.closePath();
	}
	ctx.stroke();
	ctx.fill();
}

function draw() {
	var canvas = document.getElementById('mapzone');

	if (canvas.getContext) {
		var ctx = canvas.getContext('2d');
		
		ctx.save();
		ctx.scale(scale_factor,scale_factor);
		ctx.translate(translate_x,translate_y);
		
		// draw a wide margin around the playable area
		ctx.strokeStyle = 'rgb(180, 140, 75)';
		ctx.lineWidth = frame_margin*2;
		ctx.lineJoin = 'miter';
		ctx.strokeRect(0, 0, 32*max_dim, 32*max_dim);
		
		// draw the background
		var solid_img = new Image();
		solid_img.src = 'square_rock.png';
		var ptrn_bg = ctx.createPattern(solid_img, 'repeat');
		ctx.fillStyle = ptrn_bg;
		ctx.fillRect(0, 0, 32*max_dim, 32*max_dim);

		// set up the floor pattern and border
		var walkable = new Image();
		walkable.src = 'square_clean.png';
		var ptrn = ctx.createPattern(walkable, 'repeat');
		ctx.fillStyle = ptrn;
		ctx.setLineDash([])
		ctx.strokeStyle = 'rgb(50, 45, 45)';
		ctx.lineWidth = 16;
		ctx.lineJoin = 'miter';
		ctx.miterLimit = 3
		
		// draw the walkable floor data
		draw_paths(ctx, saved_floor_paths);
		
		// draw selection graphics while making edits
		if( !key_shift ) ctx.strokeStyle = 'rgb(90, 245, 150)';
		else 			 ctx.strokeStyle = 'rgb(230, 125, 125)';
		ctx.lineWidth = 2 / scale_factor;
		if( select_box ) {			
			if( tool_mode == 'rect' )
			{
				// draw rectangular selection box
				ctx.setLineDash([4, 3]);
				ctx.strokeRect( 32*Math.min(saved_row, curr_row),
								32*Math.min(saved_col, curr_col),
								32*(1 + Math.abs(saved_row-curr_row)),
								32*(1 + Math.abs(saved_col-curr_col)));
			}
			if( tool_mode == 'circle' )
			{
				// draw elliptical selection box
				ctx.setLineDash([4, 3]);
				ctx.fillStyle = 'rgba(0, 0, 0, 0)';
				var paths_to_draw = new ClipperLib.Paths();
				var circle_path = get_circle_path( saved_row, saved_col, curr_row, curr_col, 32);
				paths_to_draw.push(circle_path);
				
				draw_paths(ctx, paths_to_draw);
			}
			if( tool_mode == 'poly' )
			{
				ctx.strokeRect( curr_row*32-4, curr_col*32-4, 8, 8 );
				
				// the new line to be added
				ctx.setLineDash([4, 3]);
				ctx.beginPath();
				if( current_path.length > 0 )
					ctx.moveTo(current_path[current_path.length-1].X,
							   current_path[current_path.length-1].Y);	// previously added vertex
				else
					ctx.moveTo(saved_row*32, saved_col*32);	// first vertex
				ctx.lineTo(curr_row*32, curr_col*32);		// currently selected vertex
				ctx.stroke();
			}
		}
		
		// draw any polygon in progress
		if( tool_mode == 'poly' && current_path.length > 0 )
		{
			var paths_to_draw = new ClipperLib.Paths();
			paths_to_draw.push(current_path);
			ctx.fillStyle = 'rgba(0, 0, 0, 0)';
			ctx.setLineDash([]);
			draw_paths(ctx, paths_to_draw);
			if( current_path.length > 0 )
				ctx.strokeRect( current_path[0].X-4, current_path[0].Y-4, 8, 8 );
		}
		
		ctx.restore();
	}
}

function get_cell_pos(evt)
{
	curr_row = Math.floor((evt.clientX-canvas_offset_x)/(32*scale_factor) - translate_x/32);
	curr_col = Math.floor((evt.clientY-canvas_offset_y)/(32*scale_factor) - translate_y/32);
	
	if( curr_row < 0 ) curr_row = 0;
	if( curr_col < 0 ) curr_col = 0;
	
	if( curr_row >= max_dim ) curr_row = max_dim-1;
	if( curr_col >= max_dim ) curr_col = max_dim-1;
}

function get_grid_pos(evt)
{
	curr_row = Math.floor((evt.clientX-canvas_offset_x)/(32*scale_factor)+(32/2-translate_x)/32);
	curr_col = Math.floor((evt.clientY-canvas_offset_y)/(32*scale_factor)+(32/2-translate_y)/32);
	
	if( curr_row < 0 ) curr_row = 0;
	if( curr_col < 0 ) curr_col = 0;
	
	if( curr_row >= max_dim ) curr_row = max_dim-1;
	if( curr_col >= max_dim ) curr_col = max_dim-1;
}

function mousedown(evt)
{
	mouse_pix.x = evt.clientX;
    mouse_pix.y = evt.clientY;
	key_shift = evt.shiftKey;
	
	if( evt.which == 1 && !drag_pan ) {
		select_box = true;
		if( tool_mode == 'rect' || tool_mode == 'circle' )
		{
			get_cell_pos(evt);
			saved_row = curr_row;
			saved_col = curr_col;
		}
		if( tool_mode == 'poly' )
		{
			get_grid_pos(evt);
			saved_row = curr_row;
			saved_col = curr_col;
		}
		draw();
	}
	if( evt.which == 3 ) {
		select_box = false;
		drag_pan = true;
	}
}

function execute_clipping(clip_paths)
{
	var clippingType = key_shift ? ClipperLib.ClipType.ctDifference : ClipperLib.ClipType.ctUnion;
	var cpr = new ClipperLib.Clipper();
	cpr.AddPaths(saved_floor_paths, ClipperLib.PolyType.ptSubject, true);
	cpr.AddPaths(clip_paths, ClipperLib.PolyType.ptClip, true);
	solution_paths = new ClipperLib.Paths();
	cpr.Execute(clippingType, solution_paths, 1, 1);
	
	// may need a hack here for the L-shaped 0-width bridge
	// https://sourceforge.net/p/jsclipper/tickets/20/
	
	console.log(JSON.stringify(solution_paths));
	saved_floor_paths = solution_paths;
}

function mouseup(evt)
{	
	key_shift = evt.shiftKey;
	if( evt.which == 1 && select_box == true ) {
		select_box = false;
		var clip_paths;
		if( tool_mode == 'rect' )
		{
			// Create the rectangle to be clipped against the existing paths
			var minrow = Math.min(saved_row, curr_row);
			var maxrow = Math.max(saved_row, curr_row)+1;
			var mincol = Math.min(saved_col, curr_col);
			var maxcol = Math.max(saved_col, curr_col)+1;
			clip_paths = [[{X:minrow*32,Y:mincol*32}, {X:maxrow*32,Y:mincol*32}, 
						   {X:maxrow*32,Y:maxcol*32}, {X:minrow*32,Y:maxcol*32}]];
						   
			execute_clipping(clip_paths);
		}
		if( tool_mode == 'circle' )
		{
			// Create the ellipse to be clipped against the existing paths
			var circle_path = get_circle_path( saved_row, saved_col, curr_row, curr_col, 32);
			clip_paths = new ClipperLib.Paths();
			clip_paths.push(circle_path);
			execute_clipping(clip_paths);
		}
		
		if( tool_mode == 'poly' )
		{
			if( current_path.length > 0 ) {
				current_path.push({X:curr_row*32,Y:curr_col*32});
				
				if( current_path[0].X == curr_row*32 &&
					current_path[0].Y == curr_col*32 )
				{
					clip_paths = new ClipperLib.Paths();
					clip_paths.push(current_path);
					execute_clipping(clip_paths);
					current_path.length = 0;
				}
			}
			else
			{
				current_path.push({X:saved_row*32,Y:saved_col*32});
				current_path.push({X:curr_row*32,Y:curr_col*32});
			}
		}
	}
	if( evt.which == 3 && drag_pan == true ) {
		drag_pan = false;
	}
	draw();
}

function mousemove(evt)
{
	if( select_box && evt.which == 1 ) {
		key_shift = evt.shiftKey;
		if( tool_mode == 'rect' || tool_mode == 'circle' ) {
			get_cell_pos(evt);
		}
		if( tool_mode == 'poly' ) {
			get_grid_pos(evt);
		}
	}
	if( drag_pan ) {
		new_x = evt.clientX;
		new_y = evt.clientY;
		
		translate_x = Math.round(translate_x + (new_x - mouse_pix.x)/scale_factor);
		translate_y = Math.round(translate_y + (new_y - mouse_pix.y)/scale_factor);
		
		if( translate_x > frame_margin ) translate_x = frame_margin;
		if( translate_y > frame_margin ) translate_y = frame_margin;
		
		if( translate_x < canvas_x - max_dim*32 - frame_margin)
			translate_x = canvas_x - max_dim*32 - frame_margin;
		if( translate_y < canvas_y - max_dim*32 - frame_margin)
			translate_y = canvas_y - max_dim*32 - frame_margin;
		
		//translate_x = Math.floor(translate_x);
		//translate_y = Math.floor(translate_y);
		
		mouse_pix.x = new_x;
		mouse_pix.y = new_y;
	}
	draw();
}

function mousewheel(evt)
{
	var delta = Math.max(-1, Math.min(1, (evt.wheelDelta || -evt.detail)));
	
	if( delta > 0 ) scale_factor = scale_factor * 2;
	else scale_factor = scale_factor * 0.5;
	
	if( scale_factor > 2) scale_factor = 2;
	if( scale_factor < 0.5) scale_factor = 0.5;
	
	draw();
}

function mouseout(evt)
{
	select_box = false;
	drag_pan = false;
	draw();
}

// stifle context menu
function contextmenu(evt)
{
	evt.preventDefault();
	return false;
}















