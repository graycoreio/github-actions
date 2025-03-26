const domain = process.env.LIGHTHOUSE_DOMAIN;

module.exports = {
    ci: {
        assert: {
            preset: "lighthouse:recommended",
        },
        collect: {
            url: [
                domain + "/",
                domain + "/test",
            ]
        }
    },
};