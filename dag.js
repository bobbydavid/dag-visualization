

// Generate DAG
var nodeCount = 20;
var svgWidth = 900, svgHeight = 800;
// The nodes are indexed by topological sort.
var nodes = d3.range(nodeCount).map(function(d) {
  return { index: d, label: 'node ' + d };
});
var links = d3.range(nodeCount * nodeCount).map(function(i) {
  return {
    source: Math.floor(i / nodeCount),
    target: i % nodeCount
  };
}).filter(function(link) {
  // Automatically reject edges that are against the topological sort.
  // Otherwise, allow a random subset of possible edges.
  return link.target > link.source && Math.random() > 0.9;
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


//
// Create d3 Components.
//

// This is the d3 component that facilitates the force graph.
var force = d3.layout.force()
    .nodes(nodes)
    .links(links)
    .size([svgWidth, svgHeight])
    .linkDistance(30 * Math.sqrt(nodeCount))
    .linkStrength(0.5)
    .charge(-300);
// Run the simulation a few times to settle things down.
force.start();
for (var i = 0; i < 100; i++) { force.tick(); }
force.stop();

// Create a separate set of node objects for DAG, so the index values don't collide.
var dagNodes = d3.range(nodeCount).map(function(d) {
  return { index: d, label: 'node ' + d };
});
var dagLinks = links.map(function(d) {
  return { source: dagNodes[d.source.index], target: dagNodes[d.target.index] };
});
var dag = new dagLayout(dagNodes, dagLinks, svgWidth, svgHeight);
/*
var dag = d3.layout.dag()
    .nodes(nodes)
    .links(links)
    .size([svgWidth, svgHeight])
    .
    */

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
      refX: 13,
      refY: 4,
      markerUnits: 'strokeWidth',
      markerWidth: 10,
      markerHeight: 8,
      orient: 'auto'
    }).append('path').attr({
      d: 'M 0 0 L 10 4 L 0 8 Z',
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
//        .call(force.drag);
var svgNodes = svg.selectAll('.node')
svgNodes.append('circle')
    .attr('r', 5);
svgNodes.append('text')
    .attr('transform', 'translate(-6,20)')
    .text(function(d) { return d.label; });

// Draw the DAG in its own SVG.
svg = d3.select('#dag')
    .append('svg')
    .attr({
        width: svgWidth,
        height: svgHeight,
        xmlns: 'http://www.w3.org/2000/svg'
      });
var svgDagEdges = svg.selectAll('.daglink')
    .data(dagLinks)
    .enter().append('line')
        .attr('class', 'daglink')
        .style('stroke', 'red')
        .attr('marker-end', 'url(#arrowhead)')
        .attr('x1', function(d) { return d.source.x; })
        .attr('y1', function(d) { return d.source.y; })
        .attr('x2', function(d) { return d.target.x; })
        .attr('y2', function(d) { return d.target.y; });

var svgDagNodes = svg.selectAll('.dagnode')
    .data(dagNodes)
    .enter().append('g')
        .attr('class', 'dagnode')
        .attr('transform', function(d) {
          return 'translate(' + d.x + ',' + d.y + ')';
        });
svgDagNodes.append('circle').attr('r', 5);
svgDagNodes.append('text')
    .attr('transform', 'translate(-6,20)')
    .text(function(d) { return d.label; });

// The tick function will update the force graph every tick.
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
    .on('tick', tick)
    .tick().tick();
force.stop();



// Class for DAG layout.
function dagLayout(nodes, links, svgWidth, svgHeight) {
  // For now, assume nodes are topologically sorted (they are).


  // Create reference arrays to parents and children.
  nodes.forEach(function(node) {
    node.children = [];
    node.parents = [];
  });

  links.forEach(function(link) {
    var sourceNode = link.source
    var targetNode = link.target;
    sourceNode.children.push(targetNode);
    targetNode.parents.push(sourceNode);
  });

  // Calculate X values.
  nodes.forEach(function(node) {
    // Determine the minimum X value.
    node.x = d3.max(node.parents, function(node) { return node.x; }) + 1 || 0;
  });
  nodes.forEach(function(node) {
    // If a node has children farther in the future, push it towards them.
    var maxX = d3.min(node.children, function(node) { return node.x; }) - 1;
    if (maxX) {
      console.log('moving X ' + node.x + ' -> ' + maxX);
      node.x = maxX;
    }
    // node.x = maxX ? maxX : node.x;
  });
  nodes.sort(function(a, b) { return a.x - b.x; });
  console.log('SORTED:');
  console.log(nodes);

  // Stateful function to remember which spots are "taken".
  var nearestY = (function() {
    var taken = {};
    return function(x, y) {
      taken[x] = taken[x] || {};
      var oldY = y;
      while (taken[x][y]) {
        y += 1;
      }
      taken[x][y] = true;
      console.log('nearestY(' + x + ',' + oldY + ') -> ' + y);
      return y;
    };
  })();

  var onlyChild = function(node) {
    return node.parents.length == 1 && node.parents[0].children.length == 1;
  };
  var placementIndex = 0;
  nodes.forEach(function(node) {
    if (node.parents.length == 0) {
      node.y = nearestY(node.x, 0);
      node.label += ' -(' + placementIndex++ + ')';
      console.log('Placed ' + node.label);
    } else if (onlyChild(node)) {
      // Skip. This node has already been placed.
      return;
    } else {
      var avgY = Math.floor(d3.mean(node.parents, function(p) { return p.y; }));
      node.y = nearestY(node.x, avgY);
      node.label += ' M(' + placementIndex++ + ')';
      console.log('Placed ' + node.label);
    }

    while (node.children.length == 1 && onlyChild(node.children[0])) {
      var child = node.children[0];
      child.y = nearestY(child.x, node.y);
      node = child;
      node.label += ' +(' + placementIndex++ + ')';
      console.log('Placed ' + node.label);
    }
  });

  nodes.forEach(function(node) {
    node.x = node.x * 100 + 50;
    node.y = node.y * 50 + 50;
  })
};
