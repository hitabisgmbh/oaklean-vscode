import { RGBAColor } from '../system/color'
import { Color } from '../types/color'

export function getHighColorValue(color: Color): RGBAColor {
	switch (color) {
		case Color.Red:
			return { red: 229, green: 18, blue: 42, alpha: 1.00 }
		case Color.Orange:
			return { red: 255, green: 165, blue: 0, alpha: 1.00 }
		case Color.Yellow:
			return { red: 255, green: 255, blue: 0, alpha: 1.00 }
		case Color.Green:
			return { red: 0, green: 128, blue: 0, alpha: 1.00 }
		case Color.Blue:
			return { red: 0, green: 0, blue: 255, alpha: 1.00 }
		case Color.Indigo:
			return { red: 75, green: 0, blue: 130, alpha: 1.00 }
		case Color.Violet:
			return { red: 238, green: 130, blue: 238, alpha: 1.00 }
		case Color.Pink:
			return { red: 255, green: 192, blue: 203, alpha: 1.00 }
		case Color.Brown:
			return { red: 165, green: 42, blue: 42, alpha: 1.00 }
		case Color.Black:
			return { red: 0, green: 0, blue: 0, alpha: 1.00 }
	}
}

export function getLowColorValue(color: Color): RGBAColor {
	switch (color) {
		case Color.Red:
			return { red: 246, green: 187, blue: 190, alpha: 0.10 }
		case Color.Orange:
			return { red: 128, green: 82, blue: 0, alpha: 0.1 }
		case Color.Yellow:
			return { red: 128, green: 128, blue: 0, alpha: 0.1 }
		case Color.Green:
			return { red: 0, green: 128, blue: 0, alpha: 0.1 }
		case Color.Blue:
			return { red: 0, green: 0, blue: 128, alpha: 0.1 }
		case Color.Indigo:
			return { red: 75, green: 0, blue: 130, alpha: 0.1 }
		case Color.Violet:
			return { red: 238, green: 130, blue: 238, alpha: 0.1 }
		case Color.Pink:
			return { red: 255, green: 192, blue: 203, alpha: 0.1 }
		case Color.Brown:
			return { red: 165, green: 42, blue: 42, alpha: 0.1 }
		case Color.Black:
			return { red: 0, green: 0, blue: 0, alpha: 0.1 }
	}
}
