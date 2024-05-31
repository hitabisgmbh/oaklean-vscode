import { getHighColorValue, getLowColorValue } from '../constants/color'
import { Color } from '../types/color'

export type RGBAColor = {
	red: number;
	green: number;
	blue: number;
	alpha: number;
};

function pickHex(color1: RGBAColor, color2: RGBAColor, weight: number) {
	const w1 = 1 - weight
	const w2 = weight
	const rgba: RGBAColor = {
		red: Math.round(color1.red * w1 + color2.red * w2),
		green: Math.round(color1.green * w1 + color2.green * w2),
		blue: Math.round(color1.blue * w1 + color2.blue * w2),
		alpha: color1.alpha * w1 + color2.alpha * w2,
	}
	return rgba
}

export const getImportanceColor = (colorEnum: Color, weight: number) => {
	return pickHex(getLowColorValue(colorEnum), getHighColorValue(colorEnum), weight)
}
