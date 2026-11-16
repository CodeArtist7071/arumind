from docs_metadata.metadata import load_metadata, should_download
from fetch_google_docs.doc_fetcher import create_drive_service, get_google_docs,download_google_doc
from googleapiclient.errors import HttpError

FOLDER_ID = "1riH6Si-VnqYFqF3yard2PxWxPS6_J9w7"


def main():
    service = create_drive_service()
    metadata = load_metadata()

    try:
        documents = get_google_docs(service,FOLDER_ID)

        if not documents:
            print("<-----------No Google Docs found.-------->")
            return

        print(f"Found {len(documents)} Google Docs.")
        downloaded = 0

        for document in documents:
            if not should_download(document, metadata):
                print(f"Skipping {document['name']} (already downloaded).")
                continue
            try:
                download_google_doc(service, document, metadata)
                downloaded += 1
            except (HttpError, OSError) as error:
                print(f"\nFailed to download {document['name']!r}: {error}")

        print(f"\nDownloaded {downloaded}/{len(documents)} documents.")
        
    finally:
        service.close()

    # process_pdf_with_docling(document)




if __name__ == "__main__":
    main()
