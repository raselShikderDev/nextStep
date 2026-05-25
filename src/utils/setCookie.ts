import type { Response } from "express";

interface authTokens {
	accessToken?: string;
	refreshToken?: string;
}

//  Set cookies
export const setAuthCookie = async (res: Response, tokens: authTokens) => {
	if (tokens.accessToken) {
		res.cookie("accessToken", tokens.accessToken, {
			httpOnly: true,
			secure: true,
			sameSite: "none",
		});
	}
	if (tokens.refreshToken) {
		res.cookie("refreshToken", tokens.refreshToken, {
			httpOnly: true,
			secure: true,
			sameSite: "none",
		});
	}
};

// Remove cookies
export const removeCookie = async (res: Response) => {
	res.clearCookie("accessToken", {
		httpOnly: true,
		secure: true,
		sameSite: "none",
	});
	res.clearCookie("refreshToken", {
		httpOnly: true,
		secure: true,
		sameSite: "none",
	});
};
