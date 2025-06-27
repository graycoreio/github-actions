# Set Version From Root

This action allows you to set the versions defined in your project from a root package version, allowing you to ensure that all packages within a project remain at compatible versions.

It is intended to be used after a build, immediately before a publish.

It currently includes a modicum of validation to ensure that you don't accidentally publish invalid content onto your registry.