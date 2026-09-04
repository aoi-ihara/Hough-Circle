export type Point = { x: number; y: number };

export type CircleDetection = {
    center: Point;
    radius: number;
    score: number;
    coverage: number;
    error: number;
};

const TAU = Math.PI * 2;

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, value));
}

/** A lightweight circle Hough transform tuned for a freehand stroke. */
export function detectCircle(
    points: Point[],
    width: number,
    height: number,
): CircleDetection | null {
    if (points.length < 24 || width <= 0 || height <= 0) return null;

    const simplified = simplifyPoints(points, 3);
    if (simplified.length < 18) return null;

    const bounds = simplified.reduce(
        (acc, point) => ({
            minX: Math.min(acc.minX, point.x),
            maxX: Math.max(acc.maxX, point.x),
            minY: Math.min(acc.minY, point.y),
            maxY: Math.max(acc.maxY, point.y),
        }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
    );

    const span = Math.min(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
    if (span < 48) return null;

    const minRadius = Math.max(18, span * 0.32);
    const maxRadius = Math.min(Math.min(width, height) * 0.48, span * 0.9);
    const radiusStep = 6;
    const centerStep = 8;

    let best = { x: width / 2, y: height / 2, radius: span / 2, votes: -1 };

    for (let i = 0; i < simplified.length; i += 2) {
        const point = simplified[i];
        const previous = simplified[Math.max(0, i - 1)];
        const next = simplified[Math.min(simplified.length - 1, i + 1)];
        const tangentX = next.x - previous.x;
        const tangentY = next.y - previous.y;
        const tangentLength = Math.hypot(tangentX, tangentY);
        if (tangentLength < 0.001) continue;

        const normalX = -tangentY / tangentLength;
        const normalY = tangentX / tangentLength;

        for (
            let radius = minRadius;
            radius <= maxRadius;
            radius += radiusStep
        ) {
            for (const direction of [-1, 1]) {
                const centerX = point.x + normalX * radius * direction;
                const centerY = point.y + normalY * radius * direction;
                if (
                    centerX < 0 ||
                    centerX > width ||
                    centerY < 0 ||
                    centerY > height
                )
                    continue;

                const snappedX = Math.round(centerX / centerStep) * centerStep;
                const snappedY = Math.round(centerY / centerStep) * centerStep;
                const votes = countRadialAgreement(
                    simplified,
                    snappedX,
                    snappedY,
                    radius,
                    0.16,
                );
                if (votes > best.votes)
                    best = { x: snappedX, y: snappedY, radius, votes };
            }
        }
    }

    if (best.votes < simplified.length * 0.35) return null;

    const refined = refineCircle(simplified, best.x, best.y, best.radius);
    const coverage = estimateCoverage(
        simplified,
        refined.x,
        refined.y,
        refined.radius,
    );
    const error = radialError(simplified, refined.x, refined.y, refined.radius);
    const compactness = radiusConsistency(
        simplified,
        refined.x,
        refined.y,
        refined.radius,
    );
    const errorScore = clamp(
        1 - error / Math.max(refined.radius * 0.22, 1),
        0,
        1,
    );
    const finalScore = Math.round(
        clamp(
            (errorScore * 0.65 + coverage * 0.2 + compactness * 0.15) * 100,
            0,
            100,
        ),
    );

    return {
        center: { x: refined.x, y: refined.y },
        radius: refined.radius,
        score: finalScore,
        coverage,
        error,
    };
}

function simplifyPoints(points: Point[], minDistance: number) {
    const result: Point[] = [points[0]];
    for (let i = 1; i < points.length; i += 1) {
        const previous = result[result.length - 1];
        if (
            Math.hypot(points[i].x - previous.x, points[i].y - previous.y) >=
            minDistance
        )
            result.push(points[i]);
    }
    return result;
}

function countRadialAgreement(
    points: Point[],
    centerX: number,
    centerY: number,
    radius: number,
    toleranceRatio: number,
) {
    const tolerance = Math.max(6, radius * toleranceRatio);
    let votes = 0;
    for (const point of points) {
        if (
            Math.abs(
                Math.hypot(point.x - centerX, point.y - centerY) - radius,
            ) <= tolerance
        )
            votes += 1;
    }
    return votes;
}

function refineCircle(
    points: Point[],
    centerX: number,
    centerY: number,
    radius: number,
) {
    let currentX = centerX;
    let currentY = centerY;
    let currentRadius = radius;

    for (let iteration = 0; iteration < 5; iteration += 1) {
        const near = points.filter(
            (point) =>
                Math.abs(
                    Math.hypot(point.x - currentX, point.y - currentY) -
                        currentRadius,
                ) <
                currentRadius * 0.16,
        );
        if (near.length < 8) break;

        currentX = near.reduce((sum, point) => sum + point.x, 0) / near.length;
        currentY = near.reduce((sum, point) => sum + point.y, 0) / near.length;
        currentRadius =
            near.reduce(
                (sum, point) =>
                    sum + Math.hypot(point.x - currentX, point.y - currentY),
                0,
            ) / near.length;
    }

    return { x: currentX, y: currentY, radius: currentRadius };
}

function radialError(
    points: Point[],
    centerX: number,
    centerY: number,
    radius: number,
) {
    if (points.length === 0) return Infinity;
    return (
        points.reduce(
            (sum, point) =>
                sum +
                Math.abs(
                    Math.hypot(point.x - centerX, point.y - centerY) - radius,
                ),
            0,
        ) / points.length
    );
}

function radiusConsistency(
    points: Point[],
    centerX: number,
    centerY: number,
    radius: number,
) {
    if (points.length === 0) return 0;
    let variance = 0;
    for (const point of points) {
        const delta = Math.hypot(point.x - centerX, point.y - centerY) - radius;
        variance += delta * delta;
    }
    const standardDeviation = Math.sqrt(variance / points.length);
    return clamp(1 - standardDeviation / Math.max(radius * 0.2, 1), 0, 1);
}

function estimateCoverage(
    points: Point[],
    centerX: number,
    centerY: number,
    radius: number,
) {
    const bins = new Set<number>();
    for (const point of points) {
        const distance = Math.hypot(point.x - centerX, point.y - centerY);
        if (Math.abs(distance - radius) > Math.max(8, radius * 0.14)) continue;
        const angle =
            ((Math.atan2(point.y - centerY, point.x - centerX) % TAU) + TAU) %
            TAU;
        bins.add(Math.floor((angle / TAU) * 36));
    }
    return bins.size / 36;
}
