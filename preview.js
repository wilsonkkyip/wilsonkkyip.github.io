// Inspired from https://m-clark.github.io/

function rnorm(mean=0, stdev=1) {
    // https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform
    var u = 1 - math.random();
    var v = math.random();
    var z = math.sqrt( -2.0 * math.log( u ) ) * math.cos( 2.0 * math.pi * v );
    return z * stdev + mean;
}

function dist(x) {
    var output = math.zeros(x.length, x.length);
    for (let i = 0; i < x.length; i++) {
        for (let j = 0; j < x.length; j++) {
            if (i == j) {
                continue;
            } else if (i < j) {
                output.set([i,j], math.abs(x[i] - x[j]))
            } else {
                output.set([i,j], output.valueOf()[j][i])
            }
        }
    }
    return output
}

function cholesky(array) {
    // https://rosettacode.org/wiki/Cholesky_decomposition#JavaScript
    // https://www.sefidian.com/2021/12/04/steps-to-sample-from-a-multivariate-gaussian-normal-distribution-with-python-code/
	var zeros = [...Array(array.length)].map( _ => Array(array.length).fill(0));
	var L = zeros.map((row, r, xL) => row.map((v, c) => {
		var sum = row.reduce((s, _, i) => i < c ? s + xL[r][i] * xL[c][i] : s, 0);
		return xL[r][c] = c < r + 1 ? r === c ? Math.sqrt(array[r][r] - sum) : (array[r][c] - sum) / xL[c][c] : v;
	}));
	return L;
}

function A(x, m, r) {
  return (m - math.abs(x)) / r
}

var cond = document.querySelector("svg.banner");
if (cond == null) {
    var boxWidth = 1100;
    var boxHeight = 300;
    var ribbonColor = "#3a3a9f44";
    var dotColor = "#00990044";
    var lineColor = "#ff669988";
    
    var plotWidth = 22;
    var xmin = - plotWidth / 2;
    var xmax = plotWidth / 2;
    var trainSize = 20;
    var testSize = 200;
    var eps = 1e-8;
    var sigmaF = 1;
    var sigmaN = 0.09;
    var l = 1;
    var predN = 5;
    var m = 11;
    var r = 13
    
    var boxPlotRatio = boxWidth / plotWidth;
    
    var Xtrain = math.random(size=[1, trainSize], min=xmin, max=xmax)[0];
    var XtrainDist = dist(Xtrain);
    var ytrain = Xtrain.map(x => math.sin(x) + rnorm());
    var Xtest = Array.from(
        {length: testSize}, (_, i) => xmin + (plotWidth * i) / (testSize - 1)
    );
    var Xtraintest = Xtrain.concat(Xtest);
    var XtraintestDist = dist(Xtraintest);
    
    var Ky = math.chain((-1) / (2 * (l ** 2))).
        multiply(math.dotMultiply(XtrainDist, XtrainDist)).
        value;
    
    var Ky = math.chain(sigmaF).
        multiply(math.dotPow(
            math.multiply(math.ones([trainSize, trainSize]), math.exp(1)),
            Ky
        )).add(math.multiply(sigmaN, math.diag(math.ones(trainSize)))).
        value;
    
    var K = math.chain((-1) / (2 * (l ** 2))).
        multiply(math.dotMultiply(XtraintestDist, XtraintestDist)).
        value;
    
    var K = math.chain(sigmaF).
        multiply(math.dotPow(
            math.multiply(math.ones([trainSize + testSize, trainSize + testSize]), math.exp(1)),
            K
        )).
        value;
    
    var Kstar = math.subset(
        K,
        math.index(math.range(0,trainSize), math.range(trainSize, trainSize + testSize))
    );
    
    var tKstar = math.transpose(Kstar);
    
    var Kstarstar = math.chain(K).
        subset(
            math.index(math.range(trainSize,trainSize+testSize), math.range(trainSize,trainSize+testSize))
        ).
        add(math.multiply(eps, math.identity(testSize))).
        value;
    
    
    var KyInv = math.inv(Ky);
    
    var postMu = math.chain(tKstar).
        multiply(KyInv).
        multiply(ytrain).
        value;
    
    var postK = math.subtract(
        Kstarstar,
        math.chain(tKstar).multiply(KyInv).multiply(Kstar).value
    );
    
    var s2 = math.diag(postK);
    var seLower = math.chain(postMu).subtract(math.multiply(2, math.dotPow(s2, 1/2))).value;
    var seUpper = math.chain(postMu).add(math.multiply(2, math.dotPow(s2, 1/2))).value;
    
    var postKL = math.matrix(cholesky(postK.valueOf()));
    var ytest = [];
    for (let i = 0; i < predN; i++) {
        ytest[i] = (math.add(math.multiply(postKL, Array.from(
            {length: testSize}, (_, i) => rnorm()
        )), postMu)).valueOf();    
    }
    
    var trainData = [];
    for (let i = 0; i < trainSize; i++) {
        trainData.push({
            "type": "train",
            "x": Xtrain[i] * boxPlotRatio, 
            "sinx": math.sin(Xtrain[i]) * boxPlotRatio * (-1) * A(Xtrain[i], m, r),
            "ytrain": ytrain[i] * boxPlotRatio * (-1) * A(Xtrain[i], m, r)
        });
    }
    
    var testData = [];
    for (let i = 0; i < testSize; i++) {
        var t = {
            "type": "test",
            "x": Xtest[i] * boxPlotRatio,
            "sinx": math.sin(Xtest[i]) * boxPlotRatio * (-1) * A(Xtest[i], m, r),
            "seLower": seLower.valueOf()[i] * boxPlotRatio * (-1) * A(Xtest[i], m, r),
            "seUpper": seUpper.valueOf()[i] * boxPlotRatio * (-1) * A(Xtest[i], m, r)
        };
        for (let j = 0; j < predN; j++) {
            t["ytest" + String(j)] = ytest[j][i] * boxPlotRatio * (-1) * A(Xtest[i], m, r);
        }
        testData.push(t);
    }
    
    var data = trainData.concat(testData).sort(function(a, b) {return a.x - b.x});
    
    var svg = d3.select(".l-screen")
        .append("svg")
            .style("text-align", "center")
            .attr("class", "banner")
            .attr("width", boxWidth)
            .attr("height", boxHeight)
        .append("g")
            .attr("transform", "translate(" + boxWidth/2 + "," + boxHeight/2 + ")")
    
    svg
        .append("g")
        .attr("class", "bg")
        .append("path")
        .datum(data.filter(function(d) { return d.type == "test" }))
        .attr("fill", "#00000011")
        .attr("stroke", "none")
        .attr("d", d3.area()
            .x(function(d) { return d.x })
            .y0(function(d) { return d.seUpper })
            .y1(function(d) { return d.seLower })
            )
    svg
        .append("g")
        .attr("class", "ribbon")
        .append("path")
            .datum(data)
            .attr("fill", "none")
            .attr("stroke", ribbonColor)
            .attr("stroke-width", 6)
            .attr(
                "d", 
                d3.line()
                    .x(function(d) {return d.x})
                    .y(function(d) {return d.sinx})
            );
    
    var tlines = svg.append("g").attr("class", "tlines")
    for (let i = 0; i < predN; i++) {
        tlines
            .append("path")
                .datum(data.filter(function(d) { return d.type == "test"}))
                .attr("fill", "none")
                .attr("stroke", lineColor)
                .attr("stroke-width", 1.5)
                .attr("d", d3.line()
                    .x(function(d) { return d.x})
                    .y(function(d) { return d["ytest" + String(i)]}));
    }
    
    svg
        .append("g").attr("class", "tdots")
            .selectAll("dot")
            .data(data.filter(function(d) {return d.type == "train"}))
            .enter()
            .append("circle")
                .attr("cx", function(d) { return d.x })
                .attr("cy", function(d) { return d.ytrain })
                .attr("r", 5)
                .style("fill", dotColor)
    
    document.querySelector(".r2d3").setAttribute("style", "height: 0; margin: 0")
    
}

