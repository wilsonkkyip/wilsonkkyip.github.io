const boxWidth = 630;
const boxHeight = 200;
const ribbonColor = "#3a3a9f44";
const dotColor = "#00990044";
const lineColor = "#ff669988";
const seColor = "#00000011";

const plotWidth = 22;
const xmin = -plotWidth / 2;
const xmax = plotWidth / 2;
const trainSize = 20;
const testSize = 200;
const eps = 1e-8;
const pea = 1;
const noise = 0.3;
const ell = 1;
const predN = 5;
const m = plotWidth / 2;
const r = m * 1.2;
const boxPlotRatio = boxWidth / plotWidth;
const period = math.pi * 2;
const sStd = 0.5;

const ktype = {
  SEXPONENTIAL: "SEXPONENTIAL",
  PERIODIC: "PERIODIC"
};

function rnorm(n = 1, mean = 0, stdev = 1) {
  // Sample n numbers from the normal distribution
  // https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform
  let output = [];
  for (let i = 0; i < n; i++) {
    const u = 1 - math.random();
    const v = math.random();
    const z = math.sqrt(-2.0 * math.log(u)) * math.cos(2.0 * math.pi * v);
    output.push(z * stdev + mean);
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
  let zeros = [...Array(array.length)].map((_) => Array(array.length).fill(0));
  let L = zeros.map((row, r, xL) =>
    row.map((v, c) => {
      let sum = row.reduce(
        (s, _, i) => (i < c ? s + xL[r][i] * xL[c][i] : s),
        0
      );
      return (xL[r][c] =
        c < r + 1
          ? r === c
            ? Math.sqrt(array[r][r] - sum)
            : (array[r][c] - sum) / xL[c][c]
          : v);
    })
  );
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
  const sigma = math.matrix(cholesky(sigma2.valueOf()));
  let output = [];
  for (let i = 0; i < n; i++) {
    output.push(math.chain(sigma).multiply(rnorm(mu.size()[0])).add(mu).value);
  }
  return math.matrix(output);
}

function euclidMatrix(x, pow = 1) {
  /*
    This function takes a vector `x` and returns a euclidean distance matrix.
  */
  let output = math.zeros(x.size()[0], x.size()[0]);
  for (let i = 0; i < x.size()[0]; i++) {
    for (let j = 0; j < i; j++) {
      if (i == j) continue;
      output.set([i, j], math.abs(x.valueOf()[i] - x.valueOf()[j]) ** pow);
      output.set([j, i], math.abs(x.valueOf()[i] - x.valueOf()[j]) ** pow);
    }
  }
  return output;
}

function noiseMatrix(trainX, testX, noise, eps) {
  /*
    This function generate a noise diagonal matrix. The `eps` value makes sure
    the matrix is positive definite.
  */
  const trainN = trainX.size()[0];
  const testN = testX.size()[0];
  const sigmaI = math.diag(
    math.concat(
      math.ones(trainN).map((x) => x * (noise ** 2 || eps)),
      math.ones(testN).map((x) => x * eps)
    )
  );
  return sigmaI;
}

function pdkernel(
  trainX,
  testX,
  period,
  ell = 1,
  pea = 1,
  noise = 0,
  eps = 1e-8
) {
  /*
    This function generates the periodic kernel. 
  */
  const sigmaI = noiseMatrix(trainX, testX, noise, eps);
  const distSq = euclidMatrix(math.concat(trainX, testX), (pow = 1));
  const K = math
    .add(
      distSq.map((x) =>
        math.exp(math.sin((x * math.pi) / period) ** 2 / (-2 * ell ** 2))
      ),
      sigmaI
    )
    .map((x) => x * pea ** 2);
  return K;
}

function eqkernel(trainX, testX, ell = 1, pea = 1, noise = 0, eps = 1e-8) {
  /*
    This function generates the squared exponential kernel. 
  */
  const sigmaI = noiseMatrix(trainX, testX, noise, eps);
  const distSq = euclidMatrix(math.concat(trainX, testX), (pow = 2));
  const K = math
    .add(
      distSq.map((x) => math.exp(x / (-2 * ell ** 2))),
      sigmaI
    )
    .map((x) => x * pea ** 2);
  return K;
}

function posteriorCal(ytrain, K) {
  /*
    This function handles all the posterior calculations 
  */
  let output = new Object();
  const totalN = K.size()[0];
  const trainN = ytrain.size()[0];
  const trainRange = math.range(0, trainN);
  const testRange = math.range(trainN, totalN);

  output.trainK = math.subset(K, math.index(trainRange, trainRange));
  output.testK = math.subset(K, math.index(testRange, testRange));
  output.trainTestK = math.subset(K, math.index(trainRange, testRange));
  output.testTrainK = math.subset(K, math.index(testRange, trainRange));
  const KtrainInv = math.inv(output.trainK);
  output.postK = math.subtract(
    output.testK,
    math
      .chain(output.testTrainK)
      .multiply(KtrainInv)
      .multiply(output.trainTestK).value
  );
  output.choleskyK = math.matrix(cholesky(output.postK.valueOf()));
  output.postMu = math
    .chain(output.testTrainK)
    .multiply(KtrainInv)
    .multiply(ytrain).value;
  const s2 = math.diag(output.postK);
  output.seLower = math
    .chain(output.postMu)
    .subtract(s2.map((x) => 2 * x ** (1 / 2))).value;
  output.seUpper = math
    .chain(output.postMu)
    .add(s2.map((x) => 2 * x ** (1 / 2))).value;
  return output;
}

class Gpr {
  constructor(
    trainX,
    trainY,
    testX,
    kernel_type,
    noise = 0,
    eps = 1e-8,
    ell = 1,
    pea = 1,
    period = period
  ) {
    this.trainX = math.matrix(trainX);
    this.trainY = math.matrix(trainY);
    this.testX = math.matrix(testX);
    this.kernel_type = kernel_type;
    this.noise = noise;
    this.eps = eps;
    this.ell = ell;
    this.period = period;
    this._ytest = [];

    if (kernel_type === ktype.SEXPONENTIAL) {
      this.posterior = posteriorCal(
        this.trainY,
        eqkernel(this.trainX, this.testX, ell, pea, noise, eps)
      );
    } else if (kernel_type === ktype.PERIODIC) {
      this.posterior = posteriorCal(
        this.trainY,
        pdkernel(this.trainX, this.testX, period, ell, pea, noise, eps)
      );
    }
  }

  get ytest() {
    return math.matrix(this._ytest);
  }

  predict() {
    this._ytest.push(
      math
        .chain(this.posterior.choleskyK)
        .multiply(rnorm(this.testX.size()[0]))
        .add(this.posterior.postMu)
        .value.valueOf()
    );
    return math.matrix(this._ytest[this._ytest.length - 1]);
  }

  toData() {
    const trainData = [...Array(this.trainY.size()[0]).keys()].map((i) => {
      return {
        type: "train",
        x: this.trainX.valueOf()[i],
        ytrain: this.trainY.valueOf()[i],
      };
    });
    const testData = [...Array(this.testX.size()[0]).keys()].map((i) => {
      let output = {
        type: "test",
        x: this.testX.valueOf()[i],
        postMu: this.posterior.postMu.valueOf()[i],
        seLower: this.posterior.seLower.valueOf()[i],
        seUpper: this.posterior.seUpper.valueOf()[i],
      };
      for (let j = 0; j < this._ytest.length; j++) {
        output["ytest" + String(j + 1)] = this._ytest[j][i];
      }
      return output;
    });
    return trainData.concat(testData).sort(function (a, b) {
      return a.x - b.x;
    });
  }
}

function displayPlot(cls, data) {
  let svg = d3
    .select("." + cls)
    .append("svg")
    .attr("width", boxWidth)
    .attr("height", boxHeight)
    .append("g")
    .attr("transform", "translate(" + boxWidth / 2 + "," + boxHeight / 2 + ")");
  svg
    .append("g")
    .attr("class", "bg")
    .append("path")
    .datum(
      data.filter(function (d) {
        return d.type == "test";
      })
    )
    .attr("fill", seColor)
    .attr("stroke", "none")
    .attr(
      "d",
      d3
        .area()
        .x(function (d) {
          return d.x;
        })
        .y0(function (d) {
          return d.seUpper;
        })
        .y1(function (d) {
          return d.seLower;
        })
    );
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
      d3
        .line()
        .x(function (d) {
          return d.x;
        })
        .y(function (d) {
          return d.y;
        })
    );

  let tlines = svg.append("g").attr("class", "tlines");
  for (let i = 1; i <= predN; i++) {
    tlines
      .append("path")
      .datum(
        data.filter(function (d) {
          return d.type == "test";
        })
      )
      .attr("fill", "none")
      .attr("stroke", lineColor)
      .attr("stroke-width", 1.5)
      .attr(
        "d",
        d3
          .line()
          .x(function (d) {
            return d.x;
          })
          .y(function (d) {
            return d["ytest" + String(i)];
          })
      );
  }

  svg
    .append("g")
    .attr("class", "tdots")
    .selectAll("dot")
    .data(
      data.filter(function (d) {
        return d.type == "train";
      })
    )
    .enter()
    .append("circle")
    .attr("cx", function (d) {
      return d.x;
    })
    .attr("cy", function (d) {
      return d.ytrain;
    })
    .attr("r", 5)
    .style("fill", dotColor);
}

function main() {
  const Xtrain = math.random((size = [1, trainSize]), xmin, xmax)[0];
  const ytrain = math.add(
    Xtrain.map((x) => math.sin(x)),
    rnorm(trainSize, 0, sStd)
  );
  const Xtest = Array.from(
    { length: testSize },
    (_, i) => xmin + (plotWidth * i) / (testSize - 1)
  );

  const gpr = new Gpr(
    Xtrain,
    ytrain,
    Xtest,
    ktype.PERIODIC,
    noise,
    eps,
    ell,
    pea,
    period
  );

  // Generating `predN` number of lines
  [...Array(predN)].forEach((i) => {
    gpr.predict();
  });

  // reverse the y-coordinates for svg
  const data = gpr.toData().map((x) => {
    x.y = math.sin(x.x) * boxPlotRatio * -1;
    x.x = x.x * boxPlotRatio;
    if (x.type === "train") {
      x.ytrain = x.ytrain * boxPlotRatio * -1;
    } else if (x.type === "test") {
      x.postMu = x.postMu * boxPlotRatio * -1;
      x.seLower = x.seLower * boxPlotRatio * -1;
      x.seUpper = x.seUpper * boxPlotRatio * -1;
      for (let i = 1; i <= predN; i++) {
        x["ytest" + String(i)] = x["ytest" + String(i)] * boxPlotRatio * -1;
      }
    }
    return x;
  });

  displayPlot("banner-plot", data);
  displayPlot("sim-plot", data);
}

main();
