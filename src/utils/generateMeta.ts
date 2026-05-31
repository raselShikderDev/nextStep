interface GenerateMetaOptions {
	total: number;
	page?: number;
	limit?: number;
}

const generateMeta = ({ total, page = 1, limit = 10 }: GenerateMetaOptions) => {
	const totalPage = Math.ceil(total / limit);

	return {
		total,
		page,
		limit,
		totalPage,
		hasNextPage: page < totalPage,
		hasPreviousPage: page > 1,
	};
};

export default generateMeta;
