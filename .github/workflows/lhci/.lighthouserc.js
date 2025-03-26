const domain = process.env.LHCI_COLLECT__URL;

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