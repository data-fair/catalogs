/** Utility type to check if a type T includes a type U */
export type Includes<T extends any[], U> = U extends T[number] ? true : false

/** Utility type to check if capabilities include at least one publication capability */
export type HasPublicationCapability<T extends any[]> =
  Includes<T, 'createFolderInRoot'> extends true ? true :
    Includes<T, 'createFolder'> extends true ? true :
      Includes<T, 'createResource'> extends true ? true :
        Includes<T, 'replaceFolder'> extends true ? true :
          Includes<T, 'replaceResource'> extends true ? true :
            false

/**
 * Utility type to check if list method is required.
 * List is NOT required only if:
 * - NO import capability
 * - ONLY createFolderInRoot capability (and no other publication capabilities)
 */
export type IsListRequired<T extends any[]> =
  Includes<T, 'import'> extends true ? true :
    Includes<T, 'createFolder'> extends true ? true :
      Includes<T, 'createResource'> extends true ? true :
        Includes<T, 'replaceFolder'> extends true ? true :
          Includes<T, 'replaceResource'> extends true ? true :
            false
