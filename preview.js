// const math = require('mathjs');
// const d3 = require('d3');

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
var eff = 1;
var noise = 0.3;
var ell = 1;
var predN = 5;
var m = plotWidth / 2;
var r = m * 1.2;
var boxPlotRatio = boxWidth / plotWidth;

function rnorm(n=1, mean=0, stdev=1) {
    // Sample n numbers from the normal distribution
    // https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform
    var output = [];
    for (let i = 0; i < n; i++) {
        var u = 1 - math.random();
        var v = math.random();
        var z = math.sqrt( -2.0 * math.log( u ) ) * math.cos( 2.0 * math.pi * v );
        output.push( z * stdev + mean);
    }
    return math.matrix(output);
}

function cholesky(array) {
    /* 
    Perform Cholesky decomposition for a positive definite matrix `array`
    such that 
    array = output %*% output^T
    */
    // https://rosettacode.org/wiki/Cholesky_decomposition#JavaScript
    // https://www.sefidian.com/2021/12/04/steps-to-sample-from-a-multivariate-gaussian-normal-distribution-with-python-code/
	var zeros = [...Array(array.length)].map( _ => Array(array.length).fill(0));
	var L = zeros.map((row, r, xL) => row.map((v, c) => {
		var sum = row.reduce(
            (s, _, i) => i < c ? s + xL[r][i] * xL[c][i] : s, 0
        );
		return xL[r][c] = c < r + 1 ? r === c ? Math.sqrt(array[r][r] - sum) : (array[r][c] - sum) / xL[c][c] : v;
	}));
	return L;
}

function mvrnorm(n, mu, sigma2) {
    /*
    Sample n vectors from multivariate normal distribution with mean `mu`
    and variance `sigma2`. The function decomposes the variance by 
    Cholesky decomposition (`sigma`) and convert a standard normal vector (x) 
    into the desire distribution by 
        (x - mu) / sigma ~ N(0, I)
    */
    var sigma = math.matrix(cholesky(sigma2.valueOf()));
    var output = [];
    for (let i = 0; i < n; i++) {
        output.push(math.chain(sigma).multiply(rnorm(mu.size()[0])).add(mu).value);
    }
    return math.matrix(output);
}

function euclidMatrix(x, pow=1) {
    /*
    This function takes a vector `x` and returns a euclidean distance matrix.
    */
    var output = math.zeros(x.size()[0], x.size()[0]);
    for (let i = 0; i < x.size()[0]; i ++) {
        for (let j = 0; j < i; j++) {
            if (i == j) continue
            output.set([i,j], math.abs(x.valueOf()[i] - x.valueOf()[j]) ** pow)
            output.set([j,i], math.abs(x.valueOf()[i] - x.valueOf()[j]) ** pow)
        }
    }
    return output;
}

function noiseMatrix(trainX, testX, noise, eps) {
    /*
    This function generate a noise diagonal matrix. The `eps` value makes sure
    the matrix is positive definite.
    */
    var trainN = trainX.size()[0];
    var testN = testX.size()[0];
    var sigmaI = math.diag(math.concat(
        math.ones(trainN).map(x => x * ((noise ** 2 || eps))),
        math.ones(testN).map(x => x * eps)
    ));
    return sigmaI;
}

function pdkernel(trainX, testX, p, ell=1, eff=1, noise=0, eps=1e-8) {
    /*
    This function generates the periodic kernel. 
    */
    var sigmaI = noiseMatrix(trainX, testX, noise, eps);
    var distSq = euclidMatrix(math.concat(trainX, testX), pow=1);
    var K = math.add(
        distSq.map(x => math.exp(( math.sin(x * math.pi / p) ** 2 ) / (-2 * (ell ** 2)))),
        sigmaI
    ).map(x => x * (eff ** 2));
    return K;
}

function eqkernel(trainX, testX, ell=1, eff=1, noise=0, eps=1e-8) {
    /*
    This function generates the squared exponential kernel. 
    */
    var sigmaI = noiseMatrix(trainX, testX, noise, eps);
    var distSq = euclidMatrix(math.concat(trainX, testX), pow=2);
    var K = math.add(
        distSq.map(x => math.exp(x / (-2 * (ell ** 2)))),
        sigmaI
    ).map(x => x * (eff ** 2));
    return K
}

var ktype = {
    "SEXPONENTIAL": "SEXPONENTIAL",
    "PERIODIC": "PERIODIC"
}

function posteriorCal(ytrain, K) {
    /*
    This function handles all the posterior calculations 
    */
    var output = new Object();
    var totalN = K.size()[0];
    var trainN = ytrain.size()[0];
    var trainRange = math.range(0, trainN);
    var testRange = math.range(trainN, totalN);

    output.trainK = math.subset(K, math.index(trainRange, trainRange));
    output.testK = math.subset(K, math.index(testRange, testRange));
    output.trainTestK = math.subset(K, math.index(trainRange, testRange));
    output.testTrainK = math.subset(K, math.index(testRange, trainRange));
    var KtrainInv = math.inv(output.trainK);
    output.postK = math.subtract(
        output.testK,
        math.chain(output.testTrainK).multiply(KtrainInv).multiply(output.trainTestK).value
    );
    output.choleskyK = math.matrix(cholesky(output.postK.valueOf()));
    output.postMu = math.chain(output.testTrainK).multiply(KtrainInv).multiply(ytrain).value;
    var s2 = math.diag(output.postK);
    output.seLower = math.chain(output.postMu).subtract(s2.map(x => 2 * (x ** (1/2)))).value;
    output.seUpper = math.chain(output.postMu).add(s2.map(x => 2 * (x ** (1/2)))).value;
    return output;
}

class Gpr {
    constructor(trainX, trainY, testX, kernel_type, noise=0, eps=1e-8, ell=1, eff=1, p) {
        this.trainX = math.matrix(trainX); 
        this.trainY = math.matrix(trainY);
        this.testX = math.matrix(testX);
        this.kernel_type = kernel_type;
        this.noise = noise;
        this.eps = eps;
        this.ell = ell;
        this.p = p;
        this._ytest = [];

        if (kernel_type === ktype.SEXPONENTIAL) {
            this.posterior = posteriorCal(
                this.trainY, eqkernel(this.trainX, this.testX, ell, eff, noise, eps)
            );
        } else if (kernel_type === ktype.PERIODICAL) { 
            this.posterior = posteriorCal(
                this.trainY, pdkernel(this.trainX, this.testX, p, ell, eff, noise, eps)
            );
        }
    }

    get ytest() {
        return math.matrix(this._ytest);
    }

    predict() {
        
        this._ytest.push(math.chain(this.posterior.choleskyK)
            .multiply(rnorm(this.testX.size()[0]))
            .add(this.posterior.postMu).value.valueOf());
        return math.matrix(this._ytest[this._ytest.length - 1]);
        
    }

    toData() {
        var trainData = [...Array(this.trainY.size()[0]).keys()].map(i => {
            return {
                "type": "train",
                "x": this.trainX.valueOf()[i],
                "ytrain": this.trainY.valueOf()[i]
            };
        });
        var testData = [...Array(this.testX.size()[0]).keys()].map(i => {
            var output = {
                "type": "test",
                "x": this.testX.valueOf()[i],
                "postMu": this.posterior.postMu.valueOf()[i],
                "seLower": this.posterior.seLower.valueOf()[i],
                "seUpper": this.posterior.seUpper.valueOf()[i],
            };
            for (let j = 0; j < this._ytest.length; j++) {
                output["ytest" + String(j + 1)] = this._ytest[j][i];
            }
            return output;
        });
        return trainData.concat(testData).sort(function(a, b) {return a.x - b.x});
    }
}

function A(x, m, r) {
    return (m - math.abs(x)) / r
}

export function main() {
    var oriSvg = document.querySelector(".l-screen svg");
    if (oriSvg != null) {
        oriSvg.remove();
    }
    
    var Xtrain = math.random(size=[1, trainSize], min=xmin, max=xmax)[0];
    var ytrain = Xtrain.map(x => math.sin(x) + rnorm().valueOf()[0]);
    var Xtest = Array.from(
        {length: testSize}, (_, i) => xmin + (plotWidth * i) / (testSize - 1)
    );
    
    var gpr = new Gpr(Xtrain, ytrain, Xtest, ktype.SEXPONENTIAL, noise=noise);
    [...Array(predN)].forEach(i => {gpr.predict()});
    var data = gpr.toData().map(x => {
        var ratio = A(x.x, m, r);
        x.y = math.sin(x.x) * boxPlotRatio * (-1) * ratio;
        x.x = x.x * boxPlotRatio;
        if (x.type === "train") {
            x.ytrain = x.ytrain * boxPlotRatio * (-1) * ratio;
        } else if (x.type === "test") {
            x.postMu = x.postMu * boxPlotRatio * (-1) * ratio;
            x.seLower = x.seLower * boxPlotRatio * (-1) * ratio;
            x.seUpper = x.seUpper * boxPlotRatio * (-1) * ratio;
            for (let i = 1; i <= predN; i++) {
                x["ytest" + String(i)] = x["ytest" + String(i)] * boxPlotRatio * (-1) * ratio;
            }
        }
        return x;
    });

    var svg = d3.select(".l-screen")
        .append("svg")
            .attr("onclick", "main")
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
            .y1(function(d) { 
                return d.seLower;
             })
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
                    .y(function(d) {return d.y})
            );
    
    var tlines = svg.append("g").attr("class", "tlines")
    for (let i = 1; i <= predN; i++) {
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
    
    document.querySelector(".r2d3").setAttribute("style", "height: 0; margin: 0");
}
