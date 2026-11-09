/** 正の重みに比例して候補を選ぶ。 */
export function selectWeightedCandidate<T>(
    candidates: readonly T[],
    getWeight: (candidate: T, index: number, candidates: readonly T[]) => number,
    random: () => number = Math.random,
): T
{
    const weights = candidates.map(getWeight);
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    if (!weights.length || weights.some(w => !Number.isFinite(w) || w <= 0) || !Number.isFinite(total))
        throw new Error('Invalid candidate weights');
    let value = random() * total;
    for (let i = 0; i < candidates.length; i++) {
        value -= weights[i];
        if (value < 0) return candidates[i];
    }
    return candidates[candidates.length - 1];
}
