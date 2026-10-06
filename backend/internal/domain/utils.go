package domain

func isValidHex(s string) bool {
	if len(s) != 7 || s[0] != '#' {
		return false
	}

	for _, c := range s[1:] {
		if !((c >= '0' && c <= '9') || (c >= 'a' && c <= 'f') || (c >= 'A' && c <= 'F')) {
			return false
		}
	}

	return true
}
