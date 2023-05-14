export interface PackageJson {
  name: string;
  version: string;
  scripts?: {
    [key: string]: string;
  }
  devDependencies?: {
    [key: string]: string;
  };
  optionalDependencies?: {
    [key: string]: string;
  };
  peerDependencies?: {
    [key: string]: string;
  };
  dependencies?: {
    [key: string]: string;
  };
}