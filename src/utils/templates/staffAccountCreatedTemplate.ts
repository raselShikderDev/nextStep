const staffAccountCreatedTemplate = ({
	name,
	email,
	temporaryPassword,
}: {
	name: string;
	email: string;
	temporaryPassword: string;
}) => `
<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8" />
	<title>Account Created</title>
</head>
<body>
	<h2>Welcome ${name}</h2>
	<p>Email: ${email}</p>
	<p>Temporary Password: ${temporaryPassword}</p>
</body>
</html>
`;

export default staffAccountCreatedTemplate;
