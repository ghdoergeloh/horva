/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  // Start narrow: circular imports are close to always a real bug (they can
  // hide load-order issues and make modules hard to reason about
  // independently), unlike layering rules, which need an actual architecture
  // decision first. Add those once someone's made that call.
  forbidden: [
    {
      name: "no-circular",
      severity: "warn",
      comment:
        "This dependency is part of a circular relationship. You might want to revise " +
        "your solution (i.e. use dependency inversion, make sure the modules have a " +
        "single responsibility).",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    exclude: {
      path: [
        "node_modules",
        "\\.(test|spec)\\.[jt]sx?$",
        "(^|/)out/",
        "(^|/)dist/",
        "(^|/)coverage/",
        "routeTree\\.gen\\.ts$",
      ],
    },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
    },
  },
};
