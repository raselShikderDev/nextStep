import { Resend } from "resend";

import envVar from "@/config/env.config";

const resend = new Resend(
	envVar.RESEND_API_KEY,
);

export default resend;