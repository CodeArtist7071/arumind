"""Read-only hardware/dependency check. No weights are downloaded."""
import importlib.metadata


def main():
    try:
        import torch
        for package in ('torch', 'torchvision', 'transformers', 'PyMuPDF'):
            print(f'{package}: {importlib.metadata.version(package)}')
        if not torch.cuda.is_available():
            raise RuntimeError('No usable NVIDIA CUDA device detected.')
        print(f'GPU: {torch.cuda.get_device_name(0)}')
        if not torch.cuda.is_bf16_supported():
            raise RuntimeError('GPU does not support the required BF16 operations.')
        print('CUDA/BF16 available. Model inference still needs a real PDF smoke test.')
    except (ImportError, RuntimeError, importlib.metadata.PackageNotFoundError) as error:
        raise SystemExit(f'Unlimited-OCR runtime unavailable: {error}')


if __name__ == '__main__':
    main()
