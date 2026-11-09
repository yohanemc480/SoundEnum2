/** 復号したベクトル群。vectorsはhashesの順にdimensions個ずつ並ぶ。 */
export interface DecodedSearchVectors {
    hashes: string[];
    dimensions: number;
    vectors: Float32Array;
}

/** SEVB形式のバイナリを復号する。リトルエンディアンのヘッダーにSHA-1とFloat32の組が続く。 */
export function decodeSearchVectors(binary: ArrayBuffer): DecodedSearchVectors
{
    const view = new DataView(binary);
    if (view.byteLength < 16 || view.getUint32(0, false) !== 0x53455642 || view.getUint32(4, true) !== 1)
        throw new Error('Invalid vector header');
    const count = view.getUint32(8, true);
    const dimensions = view.getUint32(12, true);
    const stride = 20 + dimensions * 4;
    if (!count || !dimensions || 16 + count * stride !== view.byteLength)
        throw new Error('Invalid vector size');
    const hashes: string[] = [];
    const vectors = new Float32Array(count * dimensions);
    for (let row = 0; row < count; row++) {
        const offset = 16 + row * stride;
        let hash = '';
        for (let i = 0; i < 20; i++) hash += view.getUint8(offset + i).toString(16).padStart(2, '0');
        hashes.push(hash);
        for (let d = 0; d < dimensions; d++) vectors[row * dimensions + d] = view.getFloat32(offset + 20 + d * 4, true);
    }
    if (new Set(hashes).size !== count) throw new Error('Duplicate vector hash');
    return { hashes, dimensions, vectors };
}
