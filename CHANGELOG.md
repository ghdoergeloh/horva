# Changelog

## [0.1.0](https://github.com/ghdoergeloh/horva/compare/v0.0.1...v0.1.0) (2026-11-25)


### Features

* **db:** open PGlite folders and copy data between databases ([2e2a57a](https://github.com/ghdoergeloh/horva/commit/2e2a57ab1dd97002e2ac32fb71ace015849297ef))
* **db:** support PGlite folders next to PostgreSQL and copy data between them ([#114](https://github.com/ghdoergeloh/horva/issues/114)) ([0919687](https://github.com/ghdoergeloh/horva/commit/091968742c7a3f0a6cbd96505cc592559940879a))
* **electron:** offer a local database in the setup wizard ([6617c66](https://github.com/ghdoergeloh/horva/commit/6617c666ffd90655f9b255350721325ab5c5be0a))
* **electron:** offer a local database in the setup wizard ([#115](https://github.com/ghdoergeloh/horva/issues/115)) ([0eea40b](https://github.com/ghdoergeloh/horva/commit/0eea40bd6c44f35c83fe136592882d7c1b700512))
* **electron:** switch the database in the settings ([861fca6](https://github.com/ghdoergeloh/horva/commit/861fca683f437e77ed2fee586957fb05e3f4ff4b))
* **electron:** switch the database in the settings ([#116](https://github.com/ghdoergeloh/horva/issues/116)) ([747ce81](https://github.com/ghdoergeloh/horva/commit/747ce81f989b1ff9366391e2daf30658ad7ee7bc))


### Bug Fixes

* address the review of the dependency update ([fae58ba](https://github.com/ghdoergeloh/horva/commit/fae58ba5955b5ec897a99a747d06d498228d21f8))
* **core:** keep the wall-clock time of recurring tasks with a time zone ([4b32134](https://github.com/ghdoergeloh/horva/commit/4b32134ebba87fcc23a7e3d52b356a31b00dc4a9))
* **core:** keep the wall-clock time of recurring tasks with a time zone ([#135](https://github.com/ghdoergeloh/horva/issues/135)) ([1d4a2a3](https://github.com/ghdoergeloh/horva/commit/1d4a2a322d19649dd5d8a2c1fa3c6b8b6b4e615d))
* **db:** apply and record the migration that drizzle skips because of its date ([84e4d28](https://github.com/ghdoergeloh/horva/commit/84e4d287463e307aab1afcbed43dba7432178cce))
* **db:** apply and record the migration that drizzle skips because of its date ([#127](https://github.com/ghdoergeloh/horva/issues/127)) ([40a4b05](https://github.com/ghdoergeloh/horva/commit/40a4b05a9bec7676f3299c9f30746b6e257a0042))
* **db:** keep exact values in copies and harden the PGlite lock ([ae3bda3](https://github.com/ghdoergeloh/horva/commit/ae3bda31a634b4c79f9a71a33c4eba0cdea9669b))
* **db:** name the PostgreSQL version when a folder does not match ([e34eed9](https://github.com/ghdoergeloh/horva/commit/e34eed9010ae115c9a38624fba29635847144a43))
* **db:** repair a skipped migration once and refuse a partial 0002 ([15d1477](https://github.com/ghdoergeloh/horva/commit/15d1477bc052a2229bb9a8f85c3f13a5703d3958))
* **db:** stay on PGlite 0.5 so existing local databases open ([d2cd399](https://github.com/ghdoergeloh/horva/commit/d2cd399876eb5825832bde234955167bbb27c513))
* **db:** stay on PGlite 0.5 so existing local databases open ([#136](https://github.com/ghdoergeloh/horva/issues/136)) ([e93a9a2](https://github.com/ghdoergeloh/horva/commit/e93a9a2607b83d5a2abe247b450194ffa24a537b))
* **electron:** keep a configured folder and recover from a failed start ([04356e7](https://github.com/ghdoergeloh/horva/commit/04356e72daaafbc20e099eadd096919432baad4b))
* **electron:** link the setup fields to their labels ([3043270](https://github.com/ghdoergeloh/horva/commit/3043270166ca854b2768f14b5928bafc7d0246c9))
* **electron:** link the setup fields to their labels ([#68](https://github.com/ghdoergeloh/horva/issues/68)) ([593d874](https://github.com/ghdoergeloh/horva/commit/593d874302b96aeab7f00ced3c04f5acfd666a78))
* **electron:** show plain setup errors and reconnect after a corrected URL ([5e0416a](https://github.com/ghdoergeloh/horva/commit/5e0416aa604b7ba0b9f47ebc4c501d311b1da15e))
* **electron:** show plain setup errors and reconnect after a corrected URL ([#113](https://github.com/ghdoergeloh/horva/issues/113)) ([03d379d](https://github.com/ghdoergeloh/horva/commit/03d379d2db9e9b2fd3b0765f78751617b05ceeaa))
* **electron:** switch the connection safely and go back on a failed start ([79e5df5](https://github.com/ghdoergeloh/horva/commit/79e5df589a8caf4b21875a6ee3bc59f46f9e03c8))
* **electron:** type-check against the Node.js inside Electron ([7dd4ddc](https://github.com/ghdoergeloh/horva/commit/7dd4ddcd1ee961eecce7368c62582bec3c1d4769))
* **electron:** type-check against the Node.js inside Electron ([#132](https://github.com/ghdoergeloh/horva/issues/132)) ([4c8da2a](https://github.com/ghdoergeloh/horva/commit/4c8da2a0ff6b5a0f2f9c16b1e5fd7148ecd84c6c))
* **quality:** catch dynamic imports of tailwind-variants outside lib/tw.ts ([265552d](https://github.com/ghdoergeloh/horva/commit/265552daa052565423f779947a28d5588835d1a9))
* **quality:** enforce the tailwind-variants rule with dependency-cruiser ([2c57680](https://github.com/ghdoergeloh/horva/commit/2c5768063127df62467dc4d1bf136b22efc1d0f1))
* **quality:** keep installed packages out of the depcruise exclude list ([2be437b](https://github.com/ghdoergeloh/horva/commit/2be437b7a102c4087d2b4a1d3c4e308e4a0617d2))
* **quality:** let dependency-cruiser see imports into node_modules ([0f5b260](https://github.com/ghdoergeloh/horva/commit/0f5b260619f2af16f7596e728aa8266f8cfb4c3b))
* **react:** also replace a stored unknown zone in @internationalized/date ([9c840b3](https://github.com/ghdoergeloh/horva/commit/9c840b3a5bae5b617e01baad74b46cbb6c5ec61d))
* **react:** fall back to UTC when the runtime time zone is invalid ([#70](https://github.com/ghdoergeloh/horva/issues/70)) ([c98fde4](https://github.com/ghdoergeloh/horva/commit/c98fde4c68fadf74dcd559714294793b92607e84))
* **release:** address the review of the release automation ([fb7de71](https://github.com/ghdoergeloh/horva/commit/fb7de71e29bdaa011b3f799f1e9f10de3022882c))
* **ui:** block every entry of tailwind-variants outside lib/tw.ts ([2d8bc9b](https://github.com/ghdoergeloh/horva/commit/2d8bc9b591b4a162430fb2ef80a42493718a637c))
* **ui:** block tailwind-merge and dynamic imports outside lib/tw.ts ([8ca0901](https://github.com/ghdoergeloh/horva/commit/8ca09010bf183b238bd54891886c9bb89355eaa9))
* **ui:** keep a line height next to a later font size ([ab651ea](https://github.com/ghdoergeloh/horva/commit/ab651ea3dfea2d4ed59157aa6280aae27fc5e025)), closes [#54](https://github.com/ghdoergeloh/horva/issues/54)
* **ui:** keep a line height next to a later font size ([#55](https://github.com/ghdoergeloh/horva/issues/55)) ([5e8cb2c](https://github.com/ghdoergeloh/horva/commit/5e8cb2cddcbea799fcacbdc093eb88f4fd0fd7e6))
* **ui:** merge the template check for tailwind-variants imports ([#133](https://github.com/ghdoergeloh/horva/issues/133)) ([4f16336](https://github.com/ghdoergeloh/horva/commit/4f16336cdedafec25c92eece2df4e21d3776bf2e))
* **ui:** start the name of the gap button with its visible text ([eca33d2](https://github.com/ghdoergeloh/horva/commit/eca33d27cf1609c0899aaf3f24ff1fe821a17f5f))
