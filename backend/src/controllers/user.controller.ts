import { Request , Response } from "express";
import prisma from "../db/prismaClient.js";

export const getUserInsights = async (req: Request, res: Response) => {
        const userId = req.query.uid as string;
        if (!userId) {
                return res.status(400).json({ message: "User ID is required" });
        }
        try {
                const userData = await prisma.user.findUnique({
                        where: { id: userId },
                        include: {repos : true , reviews : {
                                orderBy : { createdAt : "desc" }, take : 5
                        } , insights : true}
                });
                if (!userData) {
                        return res.status(404).json({ message: "User not found" });
                }
                res.status(200).json(userData);
        }
        catch (error) {
                console.error("Error fetching user insights:", error);
                res.status(500).json({ message: "Internal server error" });
        }
};