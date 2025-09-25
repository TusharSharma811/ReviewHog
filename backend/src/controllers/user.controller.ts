import { Request , Response } from "express";
import prisma from "../db/prismaClient.js";
export const getUserInsights = async (req: Request, res: Response) => {
        const {id} = req.query;
        try {
                const insights = await prisma.user.findUnique({
                        where: { id: String(id) },
                        include: { insights: true }
                });
                res.json(insights);
        } catch (error) {
                console.error("Error fetching user insights:", error);
                res.status(500).json({ message: "Internal Server Error" });
        }
};

export const getUserRepositories = async (req: Request, res: Response) => {
        const {id} = req.query;
        try {
                const repositories = await prisma.user.findUnique({
                        where: { id: String(id) },
                        include: { repos: true }
                });
                res.json(repositories);
        } catch (error) {
                console.error("Error fetching user repositories:", error);
                res.status(500).json({ message: "Internal Server Error" });
        }
};

export const getUserRecentReviews = async (req: Request, res: Response) => {
        const {id} = req.query;
        try {
                const reviews = await prisma.user.findUnique({
                        where: { id: String(id) },
                        include: { reviews: true }
                });
                res.json(reviews);
        } catch (error) {
                console.error("Error fetching user recent reviews:", error);
                res.status(500).json({ message: "Internal Server Error" });
        }
};
