import wc from "./witness_calculator";

export async function generateWitness (input, wasmFile) {
	const response = await fetch(wasmFile);
	const buffer = await response.arrayBuffer();
	let buff;

	await wc(buffer).then(async witnessCalculator => {
		buff = await witnessCalculator.calculateWTNSBin(input, 0);
	});
	return buff;
}
