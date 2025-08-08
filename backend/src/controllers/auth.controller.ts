import { Request, Response } from "express";

export const githubLogin = async (req: Request, res: Response) => {
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${process.env.GITHUB_REDIRECT_URI}&scope=user:email%20repo`;
    res.redirect(githubAuthUrl);
};

export const githubCallback = async (req: Request, res: Response) => {
    const { code } = req.query;
    if (!code) {
        return res.status(400).send("Missing code parameter");
    }

    fetch(`https://github.com/login/oauth/access_token`, {
        method: "POST",
        headers: {
            Accept: "application/json",
        },
        body: JSON.stringify({
            client_id: process.env.GITHUB_CLIENT_ID,
            client_secret: process.env.GITHUB_CLIENT_SECRET,
            code,
        }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.error) {
                return res.status(400).send(data.error);
            }
            // Use the access token (data.access_token) to make authenticated requests
            res.send("GitHub authentication successful");
        })
        .catch((error) => {
            console.error("Error exchanging code for access token:", error);
            res.status(500).send("Internal Server Error");
        });
};