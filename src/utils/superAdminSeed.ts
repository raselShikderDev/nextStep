import bcrypt from "bcryptjs";
import prisma from "@/config/db.config";
import envVar from "@/config/env.config";
import { Role } from "../../prisma/generated/prisma/enums";

const seedSuperAdmin = async () => {
	const isExist = await prisma.user.findFirst({
		where: {
			role: "SUPER_ADMIN",
		},
	});

	if (isExist) {
		console.log("Super admin already exists");
		return;
	}

	const hashedPassword = await bcrypt.hash(
		envVar.SUPER_ADMIN_PASS as string,
		Number(envVar.HASH_ROUND as string),
	);

	const user = await prisma.user.create({
		data: {
			email: envVar.SUPER_ADMIN_EMAIL as string,
			passwordHash: hashedPassword,
			role: Role.SUPER_ADMIN,
			isVerified: true,
			userDetails: {
				create: {
					name: "Super Admin",
					phone: "01700000000",
					address: "Bangladesh",
				},
			},
		},
	});

	console.log("Super admin seeded successfully");
	console.log(user.email);
};

export default seedSuperAdmin;
