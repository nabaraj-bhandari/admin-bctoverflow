-- CreateTable
CREATE TABLE "Subject" (
    "code" TEXT NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "subjectCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "githubPath" TEXT NOT NULL,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("subjectCode","id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "subjectCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("subjectCode","resourceId","id")
);

-- AddForeignKey
ALTER TABLE "Resource" ADD CONSTRAINT "Resource_subjectCode_fkey" FOREIGN KEY ("subjectCode") REFERENCES "Subject"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_subjectCode_resourceId_fkey" FOREIGN KEY ("subjectCode", "resourceId") REFERENCES "Resource"("subjectCode", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
