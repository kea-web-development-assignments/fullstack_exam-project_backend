const fieldRequiredMessage = (fieldLabel) => `${fieldLabel} is required!`;
const fieldInvalidMessage = (fieldLabel) => `${fieldLabel} is invalid!`;

const gameFieldsLookup = {
    name: {
        label: 'Name',
        regex: '^[a-zA-Z0-9 :()-]{1,100}$',
    },
    description: {
        label: 'Description',
        regex: '^[\\s\\S]{1,1000}$',
    },
    releaseDate: {
        label: 'Release Date',
        validationFunction: (releaseDate) => releaseDate ? !isNaN(Date.parse(releaseDate)) : true,
    },
    image: {
        label: 'Image',
        validationFunction: (image) => image ? (typeof screenshot === 'string' || validateImage(image)) : true,
    },
    screenshots: {
        label: 'Screenshots',
        validationFunction: (screenshots) => screenshots?.every(screenshot => typeof screenshot === 'string' || validateImage(screenshot)) ?? true,
    },
    tags: {
        label: 'Tags',
        validationFunction: (tags) => tags?.every(tag => /^[a-zA-Z0-9 \-]{1,100}$/.test(tag.name)) ?? true,
    },
    platforms: {
        label: 'Platforms',
        validationFunction: (platforms) => platforms?.every(platform => /^[a-zA-Z0-9 \-:()]{1,100}$/.test(platform.name)) ?? true,
    },
};

export default function(
    fields = ['name', 'description', 'releaseDate', 'image', 'screenshots', 'tags', 'platforms'],
    required = true,
    includeFieldsWithoutValidation = [],
) {
    return (req, res, next) => {
        const data = req.body;

        if(data.tags?.length) {
            data.tags = data.tags
                .map(tag => JSON.parse(tag))
                .sort((a,b) => a.name.localeCompare(b.name));
        }
        if(data.platforms?.length) {
            data.platforms = data.platforms
                .map(platform => JSON.parse(platform))
                .sort((a,b) => a.name.localeCompare(b.name));
        }
        if(req.files?.image?.length) {
            data.image = req.files.image[0];
        }
        if(req.files?.['screenshots[]']?.length) {
            data.screenshots = req.files['screenshots[]'];
        }

        fields = [...new Set(fields)];
        fields = fields.filter((field) => gameFieldsLookup[field]);

        const errors = {};

        for (const field of fields) {
            if(gameFieldsLookup[field].validationFunction) {
                if(!gameFieldsLookup[field].validationFunction(data[field])) {
                    errors[field] = fieldInvalidMessage(gameFieldsLookup[field].label);
                }
                continue;
            }
            else if(data[field] === undefined || data[field] === '') {
                if(!required) continue;
                errors[field] = fieldRequiredMessage(gameFieldsLookup[field].label);
            }
            else if(gameFieldsLookup[field].regex && !(new RegExp(gameFieldsLookup[field].regex)).test(data[field])) {
                errors[field] = fieldInvalidMessage(gameFieldsLookup[field].label);
            }
        }

        if(Object.values(errors).filter(Boolean).length) {
            return res.status(400).send({
                error: {
                    message: 'Game validation failed',
                    fields: errors,
                }
            });
        }

        req.body = Object.fromEntries(
            Object.entries(data).filter(([ key, value ]) => {
                if(value === undefined || value === '' || value?.length === 0 || value?.[0]?.size === 0) {
                    return false;
                }

                return fields.includes(key) || includeFieldsWithoutValidation.includes(key);
            })
        );
        next();
    };
}

function validateImage(image) {
    if(!image?.size) {
        return false;
    }
    if(!/^image\/(avif|jpeg|png|webp)$/.test(image?.mimetype)) {
        return false;
    }

    return true;
}
