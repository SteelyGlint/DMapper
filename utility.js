// Converts Paths to SVG path string
// and scales down the coordinates
function paths2string (paths, scale) {
  var svgpath = "", i, j;
  if (!scale) scale = 1;
  for(i = 0; i < paths.length; i++) {
    for(j = 0; j < paths[i].length; j++){
      if (!j) svgpath += "M";
      else svgpath += "L";
      svgpath += (paths[i][j].X / scale) + ", " + (paths[i][j].Y / scale);
    }
    svgpath += "Z";
  }
  if (svgpath=="") svgpath = "M0,0";
  return svgpath;
}

function get2DArray(size) {
    size = size > 0 ? size : 0;
    var arr = [];
    while(size--) { arr.push([]); }
    return arr;
}

function get_circle_path(row_1, col_1, row_2, col_2, cellsize) {
	var radius_x = cellsize*(Math.abs( saved_row - curr_row )/2+0.5);
	var radius_y = cellsize*(Math.abs( saved_col - curr_col )/2+0.5);
	var center_x = cellsize*((saved_row + curr_row)/2+0.5);
	var center_y = cellsize*((saved_col + curr_col)/2+0.5);
	var count = 4*Math.min(radius_x, radius_y);
	var slice = 2 * Math.PI / count;
	var circle_path = new ClipperLib.Path();
	for( var ii=0; ii<count; ii++)
	{
		var angle = ii*slice;
		var x_coord = radius_x * Math.cos(angle)+center_x;
        var y_coord = radius_y * Math.sin(angle)+center_y;
		circle_path.push({X:x_coord,Y:y_coord});
	}
	return circle_path;
}



