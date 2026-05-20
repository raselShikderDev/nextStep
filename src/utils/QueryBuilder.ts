class QueryBuilder{
	public query: Record<string, unknown>;
	public queryString: Record<string, unknown>;

	constructor(
		query: Record<string, unknown>,
		queryString: Record<string, unknown>,
	) {
		this.query = query;
		this.queryString = queryString;
	}

	search(searchableFields: string[]) {
		const searchTerm = this.queryString.searchTerm;

		if (searchTerm) {
			this.query.OR = searchableFields.map((field) => ({
				[field]: {
					contains: searchTerm,
					mode: "insensitive",
				},
			}));
		}

		return this;
	}

	filter() {
		const excludeFields = ["searchTerm", "sort", "page", "limit", "fields"];

		const filters = { ...this.queryString };

		// biome-ignore lint/suspicious/useIterableCallbackReturn: >
		excludeFields.forEach((field) => delete filters[field]);

		Object.entries(filters).forEach(([key, value]) => {
			if (value !== undefined) {
				this.query[key] = value;
			}
		});

		return this;
	}

	sort() {
		const sort =
			(this.queryString.sort as string)?.split(",").join(" ") || "-createdAt";

		const sortFields = sort.split(" ");

		const orderBy = sortFields.map((field) => {
			if (field.startsWith("-")) {
				return {
					[field.substring(1)]: "desc",
				};
			}

			return {
				[field]: "asc",
			};
		});

		this.query.orderBy = orderBy;

		return this;
	}

	paginate() {
		const page = Number(this.queryString.page) || 1;

		const limit = Number(this.queryString.limit) || 10;

		const skip = (page - 1) * limit;

		this.query.skip = skip;

		this.query.take = limit;

		return this;
	}

	fields() {
		const fields = this.queryString.fields as string;

		if (fields) {
			const selectedFields = fields.split(",");

			const select: Record<string, boolean> = {};

			selectedFields.forEach((field) => {
				select[field] = true;
			});

			this.query.select = select;
		}

		return this;
	}

	build() {
		return this.query;
	}
}

export default QueryBuilder;
