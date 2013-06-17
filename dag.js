
// Generate DAG
var nodeCount = 8;
var svgWidth = 900, svgHeight = 300;

/*
// example: [[false, true, true], [false false true], ...]
var dagMatrix = d3.range(nodeCount).map(function(d1, i1) {
  return d3.range(nodeCount).map(function(d2, i2) {
    return !!(i1 - i2 > 0 && Math.random() > 0.6);
  });
});

// example: [[1, 3, 4], [2], [4], ...]
var adjacencyList = dagMatrix.map(function(matrixRow) {
  var edges = [];
  matrixRow.forEach(function(d, i) {
    if (d) { edges.push(i); }
  });
  return edges;
});

// example: [{x, y, value}, {x, y, value}, ...]
var dagMatrixCells = dagMatrix.map(function(row, rowIndex) {
  return row.map(function(cell, colIndex) {
    return { x: rowIndex, y: colIndex, value: cell };
  });
}).reduce(function(a, b) { return a.concat(b); });

// example: [{x, y, value}, {x, y, value}, ...]
var dagMatrixCells = links.map(function(row, rowIndex) {
  return row.map(function(cell, colIndex) {
    return { x: rowIndex, y: colIndex, value: cell };
  });
}).reduce(function(a, b) { return a.concat(b); });

*/

// The nodes are indexed by topological sort.
var nodes = d3.range(nodeCount).map(function(d) { return { index: d }; });
var links = d3.range(nodeCount * nodeCount).map(function(i) {
  return {
    source: Math.floor(i / nodeCount),
    target: i % nodeCount
  };
}).filter(function(link) {
  // Automatically reject edges that are against the topological sort.
  // Otherwise, allow a random subset of possible edges.
  return link.target > link.source && Math.random() > 0.7;
});

// Returns a helper function that takes two node indexes, and returns true if
// there is an edge from the 1st to the 2nd.
var isLinked = (function() {
  var lookup = d3.range(nodeCount).map(function() {
    return d3.range(nodeCount).map(function() { return false; });
  });
  links.forEach(function(link) {
    lookup[link.source][link.target] = true;
  });
  return function(nodeIndex1, nodeIndex2) {
    return lookup[nodeIndex1][nodeIndex2];
  };
})();

// Matrix representation of the edges. The value is true when the edge exists.
// It should be a strictly upper triangular matrix.
var dagMatrixCells = d3.merge(d3.range(nodeCount).map(function(rowIndex) {
  return d3.range(nodeCount).map(function(colIndex) {
    return {
      x: colIndex,
      y: rowIndex,
      value: isLinked(rowIndex, colIndex)
    };
  });
}));

// This is the d3 component that facilitates the force graph.
var force = d3.layout.force()
    .nodes(nodes)
    .links(links)
    .size([svgWidth, svgHeight])
    .linkDistance(30 * Math.sqrt(nodeCount))
    .charge(-300);
// Run the simulation a few times to settle things down.
force.start();
for (var i = 0; i < 30; i++) { force.tick(); }
force.stop();

//
// Create SVG elements.
//
var svg = d3.select('#force')
    .append('svg')
    .attr({
        width: svgWidth,
        height: svgHeight,
        xmlns: 'http://www.w3.org/2000/svg'
      });
// This template defines an arrowhead, and is referred to by id.
svg.append('defs').append('marker')
    .attr({
      id: 'arrowhead',
      refX: 10,
      refY: 4,
      markerUnits: 'strokeWidth',
      markerWidth: 300,
      markerHeight: 400,
      orient: 'auto'
    }).append('path').attr({
      d: 'M 0 0 L 10 4 L 0 8 z',
      fill: 'red'
    });

// Adjacency matrix.
var svgMatrix = svg.append('g').selectAll('.matrix')
    .data(dagMatrixCells)
    .enter().append('circle')
        .attr('class', 'matrix')
        .attr('cx', function(d) { return 10 * d.x + 5; })
        .attr('cy', function(d) { return 10 * d.y + 5; })
        .style('fill', function(d) { return d.y >= d.x ? 'lightgray' :
                                              d.value ? 'red' : 'gray'; })
        .attr('r', 4);

// Create the edges.
var svgEdges = svg.append('g').selectAll('.link')
    .data(force.links())
    .enter().append('line')
        .attr('class', 'link')
        .style('stroke', 'red')
        .attr('marker-end', 'url(#arrowhead)');

// Create the Nodes, then select them all (to save work during each tick).
svg.append('g').selectAll('.node')
    .data(force.nodes())
    .enter().append('g')
        .attr('class', 'node')
        .call(force.drag);
var svgNodes = svg.selectAll('.node')
svgNodes.append('circle')
    .attr('r', 5);
svgNodes.append('text')
    .attr('transform', 'translate(-6, 20)')
    .text(function(d, i) { return 'node ' + i; });

function tick() {
  svgEdges
      .attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

  svgNodes
      .attr('transform', function(d) {
        return 'translate(' + d.x + ',' + d.y + ')';
      });
}

// Everything is ready. Start the simulation!
force.start()
    .on('tick', tick);



