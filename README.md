This project implements a hybrid steganography approach by combining both spatial domain and frequency domain techniques. It uses Least Significant Bit (LSB) substitution along with Discrete Cosine Transform (DCT) to enhance security and robustness.

LSB Technique: Secret data is embedded in the least significant bits of pixel values, ensuring minimal visual distortion and high embedding capacity.
DCT Technique: The image is transformed into the frequency domain, and data is hidden within selected frequency coefficients, making it more resistant to compression and image processing attacks.

By combining LSB (for simplicity and capacity) and DCT (for robustness and security), the system provides a more secure and less detectable method of hiding information compared to using a single technique.
