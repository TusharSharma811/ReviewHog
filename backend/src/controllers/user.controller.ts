import { Request , Response } from "express";
import prisma from "../db/prismaClient.ts";
export const getUserInsights = async (req: Request, res: Response) => {
        const {id} = req.query;
        try {
                const insights = await prisma.user.findUnique({
                        where: { ownerId: String(id) },
                        include: { insights: true }
                });
                res.json(insights);
        } catch (error) {
                console.error("Error fetching user insights:", error);
                res.status(500).json({ message: "Internal Server Error" });
        }
};
