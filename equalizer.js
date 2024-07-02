/*
Biquad algorithms are taken from:
https://github.com/jaakkopasanen/AutoEq/blob/master/biquad.py
https://github.com/mohayonao/biquad-coeffs/tree/master/packages/biquad-coeffs-cookbook
*/

const Equalizer = (() => {
    const config = {
        DefaultSampleRate: 48000,
        TrebleStartFrom: 7000,
        AutoEQRange: [20, 15000],
        OptimizeQRange: [0.5, 2],
        OptimizeGainRange: [-12, 12],
        OptimizeDeltas: [
            [10, 10, 10, 5, 0.1, 0.5],
            [10, 10, 10, 2, 0.1, 0.2],
            [10, 10, 10, 1, 0.1, 0.1],
        ],
        GraphicEQRawFrequencies: (
            new Array(Math.ceil(Math.log(20000 / 20) / Math.log(1.0072))).fill(null)
            .map((_, i) => 20 * Math.pow(1.0072, i))
        ),
        GraphicEQFrequencies: Array.from(new Set(
            new Array(Math.ceil(Math.log(20000 / 20) / Math.log(1.0563))).fill(null)
            .map((_, i) => Math.floor(20 * Math.pow(1.0563, i)))
        )).sort((a, b) => a - b),
    };

    const interp = (fv, fr) => {
        let i = 0;
        return fv.map(f => {
            for (; i < fr.length - 1; ++i) {
                const [f0, v0] = fr[i];
                const [f1, v1] = fr[i + 1];
                if (i === 0 && f < f0) {
                    return [f, v0];
                } else if (f >= f0 && f < f1) {
                    const v = v0 + (v1 - v0) * (f - f0) / (f1 - f0);
                    return [f, v];
                }
            }
            return [f, fr[fr.length - 1][1]];
        });
    };

    const biquadFilter = (freq, q, gain, sampleRate, type) => {
        freq = freq / (sampleRate || config.DefaultSampleRate);
        freq = Math.max(1e-6, Math.min(freq, 1));
        q = Math.max(1e-4, Math.min(q, 1000));
        gain = Math.max(-40, Math.min(gain, 40));

        const w0 = 2 * Math.PI * freq;
        const sin = Math.sin(w0);
        const cos = Math.cos(w0);
        const a = Math.pow(10, gain / 40);
        const alpha = sin / (2 * q);
        const alphamod = (2 * Math.sqrt(a) * alpha) || 0;

        let a0, a1, a2, b0, b1, b2;
        switch (type) {
            case 'lowshelf':
                a0 = ((a + 1) + (a - 1) * cos + alphamod);
                a1 = -2 * ((a - 1) + (a + 1) * cos);
                a2 = ((a + 1) + (a - 1) * cos - alphamod);
                b0 = a * ((a + 1) - (a - 1) * cos + alphamod);
                b1 = 2 * a * ((a - 1) - (a + 1) * cos);
                b2 = a * ((a + 1) - (a - 1) * cos - alphamod);
                break;
            case 'highshelf':
                a0 = ((a + 1) - (a - 1) * cos + alphamod);
                a1 = 2 * ((a - 1) - (a + 1) * cos);
                a2 = ((a + 1) - (a - 1) * cos - alphamod);
                b0 = a * ((a + 1) + (a - 1) * cos + alphamod);
                b1 = -2 * a * ((a - 1) + (a + 1) * cos);
                b2 = a * ((a + 1) + (a - 1) * cos - alphamod);
                break;
            case 'peaking':
                a0 = 1 + alpha / a;
                a1 = -2 * cos;
                a2 = 1 - alpha / a;
                b0 = 1 + alpha * a;
                b1 = -2 * cos;
                b2 = 1 - alpha * a;
                break;
        }

        return [1.0, a1 / a0, a2 / a0, b0 / a0, b1 / a0, b2 / a0];
    };

    const lowshelf = (freq, q, gain, sampleRate) => biquadFilter(freq, q, gain, sampleRate, 'lowshelf');
    const highshelf = (freq, q, gain, sampleRate) => biquadFilter(freq, q, gain, sampleRate, 'highshelf');
    const peaking = (freq, q, gain, sampleRate) => biquadFilter(freq, q, gain, sampleRate, 'peaking');

    const calcGains = (freqs, coeffs, sampleRate) => {
        sampleRate = sampleRate || config.DefaultSampleRate;
        const gains = new Array(freqs.length).fill(0);

        coeffs.forEach(([a0, a1, a2, b0, b1, b2]) => {
            freqs.forEach((f, j) => {
                const w = 2 * Math.PI * f / sampleRate;
                const phi = 4 * Math.pow(Math.sin(w / 2), 2);
                const c = (
                    10 * Math.log10(Math.pow(b0 + b1 + b2, 2) +
                        (b0 * b2 * phi - (b1 * (b0 + b2) + 4 * b0 * b2)) * phi) -
                    10 * Math.log10(Math.pow(a0 + a1 + a2, 2) +
                        (a0 * a2 * phi - (a1 * (a0 + a2) + 4 * a0 * a2)) * phi)
                );
                gains[j] += c;
            });
        });
        return gains;
    };

    const calcPreamp = (fr1, fr2) => {
        return -Math.max(...fr1.map((_, i) => fr2[i][1] - fr1[i][1]));
    };

    const calcDistance = (fr1, fr2) => {
        return fr1.reduce((acc, _, i) => acc + Math.abs(fr1[i][1] - fr2[i][1]), 0) / fr1.length;
    };

    const filtersToCoeffs = (filters, sampleRate) => {
        return filters.map(f => {
            if (!f.freq || !f.gain || !f.q) {
                return null;
            } else if (f.type === "LSQ") {
                return lowshelf(f.freq, f.q, f.gain, sampleRate);
            } else if (f.type === "HSQ") {
                return highshelf(f.freq, f.q, f.gain, sampleRate);
            } else if (f.type === "PK") {
                return peaking(f.freq, f.q, f.gain, sampleRate);
            }
            return null;
        }).filter(f => f);
    };

    const apply = (fr, filters, sampleRate) => {
        const freqs = fr.map(f => f[0]);
        const coeffs = filtersToCoeffs(filters, sampleRate);
        const gains = calcGains(freqs, coeffs, sampleRate);
        return fr.map((f, i) => [f[0], f[1] + gains[i]]);
    };

    const asGraphicEQ = (filters, sampleRate) => {
        const rawFS = config.GraphicEQRawFrequencies;
        const fs = config.GraphicEQFrequencies;
        const coeffs = filtersToCoeffs(filters, sampleRate);
        const gains = calcGains(rawFS, coeffs, sampleRate);
        const rawFR = rawFS.map((f, i) => [f, gains[i]]);

        let i = 0;
        let resultFR = fs.map((f, j) => {
            const freqTo = (j < fs.length - 1) ? Math.sqrt(f * fs[j + 1]) : 20000;
            const points = [];
            for (; i < rawFS.length; ++i) {
                if (rawFS[i] < freqTo) {
                    points.push(rawFR[i][1]);
                } else {
                    break;
                }
            }
            const avg = points.reduce((a, b) => a + b, 0) / points.length;
            return [f, avg];
        });