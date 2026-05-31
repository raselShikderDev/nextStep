class QueryBuilder {
	private where: Record<string, unknown>;
	private queryString: Record<string, unknown>;

	private orderBy?: Record<string, string>[];
	private skip?: number;
	private take?: number;
	private select?: Record<string, boolean>;

	constructor(queryString: Record<string, unknown>) {
		this.where = {};
		this.queryString = queryString;
	}

	search(searchableFields: string[]) {
		const searchTerm = this.queryString.searchTerm;

		if (searchTerm) {
			this.where.OR = searchableFields.map((field) => ({
				[field]: {
					contains: searchTerm,
					mode: "insensitive",
				},
			}));
		}

		return this;
	}

	filter() {
		const excludeFields = [
			"searchTerm",
			"sort",
			"page",
			"limit",
			"fields",
		];

		const filters = { ...this.queryString };

		excludeFields.forEach((field) => {
			delete filters[field];
		});

		Object.entries(filters).forEach(([key, value]) => {
			if (value !== undefined) {
				this.where[key] = value;
			}
		});

		return this;
	}

	sort() {
		const sort =
			(this.queryString.sort as string)
				?.split(",")
				.join(" ") || "-createdAt";

		this.orderBy = sort.split(" ").map((field) => {
			if (field.startsWith("-")) {
				return {
					[field.slice(1)]: "desc",
				};
			}

			return {
				[field]: "asc",
			};
		});

		return this;
	}

	paginate() {
		const page = Number(this.queryString.page) || 1;
		const limit = Number(this.queryString.limit) || 10;
		this.skip = (page - 1) * limit;
		this.take = limit;

		return this;
	}

	fields() {
		const fields = this.queryString.fields as string;

		if (!fields) {
			return this;
		}

		const select: Record<string, boolean> = {};

		fields.split(",").forEach((field) => {
			select[field] = true;
		});

		this.select = select;

		return this;
	}

	getWhere() {
		return this.where;
	}

	build() {
	const query: Record<string, unknown> = {
		where: this.where,
	};

	if (this.orderBy) {
		query.orderBy = this.orderBy;
	}

	if (this.skip !== undefined) {
		query.skip = this.skip;
	}

	if (this.take !== undefined) {
		query.take = this.take;
	}

	if (this.select) {
		query.select = this.select;
	}

	return query;
}
}

export default QueryBuilder;