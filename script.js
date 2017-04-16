
var max_dim = 100;
var canvas_x;
var canvas_y;
var frame_margin = 96;

function get2DArray(size) {
    size = size > 0 ? size : 0;
    var arr = [];
    while(size--) { arr.push([]); }
    return arr;
}
var arr_room = get2DArray(max_dim);

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

function init() {
	for(var row=0; row < max_dim; row++) {
		for(var col=0; col < max_dim; col++) {
			arr_room[row][col] = 0;
			if( Math.random() > 0.5 )
			{
				//arr_room[row][col] = 1;
			}
		}
	}
	var canvas = document.getElementById('mapzone');
	var ctx = canvas.getContext('2d');
	canvas_x = canvas.width;
	canvas_y = canvas.height;
	draw();
}

function draw() {
	var canvas = document.getElementById('mapzone');
	
	canvas.addEventListener('mousedown',mousedown,false);
	canvas.addEventListener('mouseup',mouseup,false);
	canvas.addEventListener('mousemove',mousemove,false);
	canvas.addEventListener('contextmenu',contextmenu,false);
	canvas.addEventListener('mouseout', mouseout, false);

	if (canvas.getContext) {
		var ctx = canvas.getContext('2d');
		
		ctx.save();
		ctx.scale(scale_factor,scale_factor);
		ctx.translate(translate_x,translate_y);
		
		ctx.strokeStyle = 'rgb(180, 140, 75)';
		ctx.lineWidth = frame_margin*2;
		ctx.lineJoin = 'miter';
		ctx.strokeRect(0, 0, 32*max_dim, 32*max_dim);
		
		var solid_img = new Image();
		solid_img.src = 'square_rock.png';
		var ptrn_bg = ctx.createPattern(solid_img, 'repeat');
		ctx.fillStyle = ptrn_bg;
		ctx.fillRect(0, 0, 32*max_dim, 32*max_dim);

		var p = new Path2D('M15 15 h 80 v 80 h -80 Z');

		var walkable = new Image();
		walkable.src = 'square_clean.png';
		var ptrn = ctx.createPattern(walkable, 'repeat');
		ctx.fillStyle = ptrn;

		ctx.setLineDash([])
		ctx.strokeStyle = 'rgb(50, 45, 45)';
		ctx.lineWidth = 16;
		ctx.lineJoin = 'miter';
		
		for(var row=0; row < max_dim; row++) {
			for(var col=0; col < max_dim; col++) {
				if( arr_room[row][col] > 0 )
				{
					ctx.strokeRect(32*row, 32*col, 32, 32);
				}
			}
		}
		
		for(var row=0; row < max_dim; row++) {
			for(var col=0; col < max_dim; col++) {
				if( arr_room[row][col] > 0 )
				{
					ctx.fillRect(32*row, 32*col, 32, 32);
				}
			}
		}
		
		if( select_box ) {
			if( select_box ) { ctx.strokeStyle = 'rgb(90, 245, 150)'; }
			if( key_shift ) { ctx.strokeStyle = 'rgb(230, 125, 125)'; }
			ctx.setLineDash([4, 3]);
			ctx.lineWidth = 2 / scale_factor;
			ctx.strokeRect( 32*Math.min(saved_row, curr_row),
							32*Math.min(saved_col, curr_col),
							32*(1 + Math.abs(saved_row-curr_row)),
							32*(1 + Math.abs(saved_col-curr_col)));
		}
		
		ctx.restore();
	}
}

function set_curr_pos(evt)
{
	curr_row = Math.floor((evt.clientX - translate_x) / (32*scale_factor));
	curr_col = Math.floor((evt.clientY - translate_y) / (32*scale_factor));
	
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
	
	if( evt.which == 1 ) {
		select_box = true;
		set_curr_pos(evt);
		saved_row = curr_row;
		saved_col = curr_col;
		draw();
	}
	if( evt.which == 3 ) {
		select_box = false;
		drag_pan = true;
	}
}

function mouseup(evt)
{	
	key_shift = evt.shiftKey;
	if( evt.which == 1 && select_box == true ) {
		select_box = false;
		for(var row=Math.min(saved_row, curr_row); row <= Math.max(saved_row, curr_row); row++) {
			for(var col=Math.min(saved_col, curr_col); col <= Math.max(saved_col, curr_col); col++)
			{
				if( key_shift ) arr_room[row][col] = 0;
				else arr_room[row][col] = 1;
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
		set_curr_pos(evt);
		key_shift = evt.shiftKey;
	}
	if( drag_pan ) {
		new_x = evt.clientX;
		new_y = evt.clientY;
		
		translate_x = Math.round(translate_x + (new_x - mouse_pix.x));
		translate_y = Math.round(translate_y + (new_y - mouse_pix.y));
		
		if( translate_x > frame_margin ) translate_x = frame_margin;
		if( translate_y > frame_margin ) translate_y = frame_margin;
		
		if( translate_x < canvas_x - max_dim*32 - frame_margin)
			translate_x = canvas_x - max_dim*32 - frame_margin;
		if( translate_y < canvas_y - max_dim*32 - frame_margin)
			translate_y = canvas_y - max_dim*32 - frame_margin;
		
		mouse_pix.x = new_x;
		mouse_pix.y = new_y;
	}
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















