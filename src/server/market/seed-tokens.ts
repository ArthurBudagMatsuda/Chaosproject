// Project-requested Solana mint addresses, always included in scanner discovery.
// Explicit additions bypass automatic discovery thresholds once a real pair is observed.
export const projectSeedAddresses = [
  "C1mBfBoDkwWfd6uTFZp62ARHLjeVp3bDpCDMfMZtPngE",
  "Ge87EtsjwRQbHaqQmKRno69RFTwh9bfSsm99XNxTpump",
  "CbcyNo7m1amFWqEQm2m4PLv1UNvpcL3C1Ujm6AkzpKoU",
  "98kfF7rmsg1QDUEoCqNE7g7M1FdrTt92TEp2CLzypump",
  "MukLDtJ8Cx9DxLbeyLRSWPSposTMWuwHANbuaudpump",
  "GAwhcphCqCv5bKHmCiN4VDdNWfbXJL4npmkc8L3Q9S9H",
  "CTPoyCwkjMvoJwU4xvZZqoD8tiYk6yDchySiN5gGpump",
  "GkyPYa7NnCFbduLknCfBfP7p8564X1VZhwZYJ6CZpump",
  "6UtY9iTZMQQ5QZVrbzFnNaJntV7oySm9k97mvwnuZcxr",
  "A13oRB9FFaiUjfi6LdCg6p9ka1u8SfGkUFs4SKvPpump",
  "CJMihkPYswa3k6az9SUbepjKnkJQ6KWpGG5p9qW9n7NV",
  "CscZaq5twomhUkvCY8Jdd1tge32L4Yj9FbkFFEZQpump",
  "8nPoBHiBM6pybxMws9PA2JRb9BjkppBfqcZGmot4DMBC",
  "Aqv8Gj8MesSzuEsgigq4kEDWVRFHgPUZq4Po4Q1Mpump",
  "7VertkgF9KLhxxJXHX6uaWuoYZTP9LdGj2bWmVXVpump",
  "Hg5Ja55T5wESq4vyFoiVCMeHXtGyVA69X2UHq8hgpump",
  "5tCju6YNxHq5zrA6tGndr6F7TK42mpUFmeE31cSFpump",
  "GTBxUiw6wJdmmkCGZgRHLyYxqu1vG4KtRpeox6yDpump",
] as const;

// Explicit project exclusions use mint addresses, never mutable ticker symbols.
export const projectExcludedAddresses = [
  "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN", // Jupiter (JUP)
] as const;
