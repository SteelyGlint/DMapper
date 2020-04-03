
var max_dim = 100;
var canvas_x;
var canvas_y;
var square_dim = 32

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
var max_scale = 2
var min_scale = 0.5

var saved_floor_paths = new ClipperLib.Paths();
var solution_paths = new ClipperLib.Paths();
var current_path = new ClipperLib.Path();

var tool_selector;
var tool_mode = 'poly';

function ev_tool_change (evt) { 
	tool_mode = this.value;
} 

function constrain_translation()
{
	var margin_x = canvas_x * 0.5 / scale_factor
	var margin_y = canvas_y * 0.5 / scale_factor
	if( translate_x > margin_x ) translate_x = margin_x;
	if( translate_y > margin_y) translate_y = margin_y;
	
	if( translate_x < margin_x - max_dim * square_dim)
		translate_x = margin_x - max_dim * square_dim;
	if( translate_y < margin_y - max_dim * square_dim)
		translate_y = margin_y - max_dim * square_dim;
	
	translate_x = Math.floor(translate_x);
	translate_y = Math.floor(translate_y);
}

function init() {
	var canvas = document.getElementById('mapzone');
	canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;	
	
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
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	canvas_x = canvas.width;
	canvas_y = canvas.height;
	constrain_translation()

	if (canvas.getContext) {
		var ctx = canvas.getContext('2d');
		
		ctx.fillStyle = 'rgb(180, 140, 75)';
		ctx.fillRect(0, 0, canvas.width, canvas.height);
		
		ctx.save();
		ctx.scale(scale_factor,scale_factor);
		ctx.translate(translate_x,translate_y);
		
		// draw the background
		var solid_img = new Image();
		solid_img.src = 'square_rock.png';
		var ptrn_bg = ctx.createPattern(solid_img, 'repeat');
		ctx.fillStyle = ptrn_bg;
		ctx.fillRect(0, 0, square_dim*max_dim, square_dim*max_dim);

		// draw the crosshatch border
		var stroke_img = new Image();
		stroke_img.src = 'border_crosshatch_alpha.png';
		var stroke_pattern = ctx.createPattern(stroke_img, "repeat");
		
		ctx.setLineDash([])
		ctx.strokeStyle = stroke_pattern;
		ctx.lineWidth = 104;
		ctx.lineJoin = 'round';
		
		// draw the walkable floor data
		//draw_paths(ctx, saved_floor_paths);
		
		// set up the floor pattern and line border
		var walkable = new Image();
		walkable.src = 'square_clean.png';
		var ptrn = ctx.createPattern(walkable, 'repeat');
		var walkable = new Image();
		walkable.src = 'square_clean.png';
		var ptrn = ctx.createPattern(walkable, 'repeat');
		
		ctx.fillStyle = ptrn;
		ctx.setLineDash([])
		ctx.strokeStyle = 'rgb(30, 30, 30)';
		ctx.lineWidth = 12;
		ctx.lineJoin = 'miter';
		ctx.miterLimit = 3
		
		// draw the walkable floor data a second time
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
				ctx.strokeRect( square_dim*Math.min(saved_row, curr_row),
								square_dim*Math.min(saved_col, curr_col),
								square_dim*(1 + Math.abs(saved_row-curr_row)),
								square_dim*(1 + Math.abs(saved_col-curr_col)));
			}
			if( tool_mode == 'circle' )
			{
				// draw elliptical selection box
				ctx.setLineDash([4, 3]);
				ctx.fillStyle = 'rgba(0, 0, 0, 0)';
				var paths_to_draw = new ClipperLib.Paths();
				var circle_path = get_circle_path( saved_row, saved_col, curr_row, curr_col, square_dim);
				paths_to_draw.push(circle_path);
				
				draw_paths(ctx, paths_to_draw);
			}
			if( tool_mode == 'poly' )
			{
				ctx.strokeRect( curr_row*square_dim-4, curr_col*square_dim-4, 8, 8 );
				
				// the new line to be added
				ctx.setLineDash([4, 3]);
				ctx.beginPath();
				if( current_path.length > 0 )
					ctx.moveTo(current_path[current_path.length-1].X,
							   current_path[current_path.length-1].Y);	// previously added vertex
				else
					ctx.moveTo(saved_row*square_dim, saved_col*square_dim);	// first vertex
				ctx.lineTo(curr_row*square_dim, curr_col*square_dim);		// currently selected vertex
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
	curr_row = Math.floor((evt.clientX-canvas_offset_x)/(square_dim*scale_factor) - translate_x/square_dim);
	curr_col = Math.floor((evt.clientY-canvas_offset_y)/(square_dim*scale_factor) - translate_y/square_dim);
	
	if( curr_row < 0 ) curr_row = 0;
	if( curr_col < 0 ) curr_col = 0;
	
	if( curr_row >= max_dim ) curr_row = max_dim-1;
	if( curr_col >= max_dim ) curr_col = max_dim-1;
}

function get_grid_pos(evt)
{
	curr_row = Math.floor((evt.clientX-canvas_offset_x)/(square_dim*scale_factor)+(square_dim/2-translate_x)/square_dim);
	curr_col = Math.floor((evt.clientY-canvas_offset_y)/(square_dim*scale_factor)+(square_dim/2-translate_y)/square_dim);
	
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
			clip_paths = [[{X:minrow*square_dim,Y:mincol*square_dim}, {X:maxrow*square_dim,Y:mincol*square_dim}, 
						   {X:maxrow*square_dim,Y:maxcol*square_dim}, {X:minrow*square_dim,Y:maxcol*square_dim}]];
						   
			execute_clipping(clip_paths);
		}
		if( tool_mode == 'circle' )
		{
			// Create the ellipse to be clipped against the existing paths
			var circle_path = get_circle_path( saved_row, saved_col, curr_row, curr_col, square_dim);
			clip_paths = new ClipperLib.Paths();
			clip_paths.push(circle_path);
			execute_clipping(clip_paths);
		}
		
		if( tool_mode == 'poly' )
		{
			if( current_path.length > 0 ) {
				current_path.push({X:curr_row*square_dim,Y:curr_col*square_dim});
				
				if( current_path[0].X == curr_row*square_dim &&
					current_path[0].Y == curr_col*square_dim )
				{
					clip_paths = new ClipperLib.Paths();
					clip_paths.push(current_path);
					execute_clipping(clip_paths);
					current_path.length = 0;
				}
			}
			else
			{
				current_path.push({X:saved_row*square_dim,Y:saved_col*square_dim});
				current_path.push({X:curr_row*square_dim,Y:curr_col*square_dim});
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
	new_mouse_x = evt.clientX;
	new_mouse_y = evt.clientY;
		
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
		translate_x = Math.round(translate_x + (new_mouse_x - mouse_pix.x)/scale_factor);
		translate_y = Math.round(translate_y + (new_mouse_y - mouse_pix.y)/scale_factor);
		
		constrain_translation()
		
		//var viewport_center_x = (canvas.width * 0.5) - translate_x
		//if (viewport_center_x < 0) translate_x = canvas.width * 0.5
	}
	
	mouse_pix.x = new_mouse_x;
	mouse_pix.y = new_mouse_y;
	draw();
}

function mousewheel(evt)
{
	var delta = Math.max(-1, Math.min(1, (evt.wheelDelta || -evt.detail)));
	
	if( delta > 0)
	{
		// zoom in, towards the cursor
		if(scale_factor < max_scale)
		{
			translate_x -= mouse_pix.x * 0.5 / scale_factor
			translate_y -= mouse_pix.y * 0.5 / scale_factor
			scale_factor = scale_factor * 2;
			constrain_translation()
		}
	}
	else 
	{
		// zoom out from the center of the canvas
		if (scale_factor > min_scale)
		{
			scale_factor = scale_factor * 0.5;
			translate_x += mouse_pix.x * 0.5 / scale_factor
			translate_y += mouse_pix.y * 0.5 / scale_factor
			constrain_translation()
		}
	}
	
	if( scale_factor > max_scale) scale_factor = max_scale;
	if( scale_factor < min_scale) scale_factor = min_scale;
	
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















