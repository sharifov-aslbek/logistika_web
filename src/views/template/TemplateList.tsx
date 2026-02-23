import { useState, useEffect, useMemo } from 'react'
import {
    HiOutlinePlus,
    HiOutlinePencil,
    HiOutlineTrash,
    HiOutlineDownload,
    HiOutlineDocumentText,
    HiOutlineSearch,
} from 'react-icons/hi'

// --- UI Components ---
import Table from '@/components/ui/Table'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Spinner from '@/components/ui/Spinner'
import Card from '@/components/ui/Card'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
// import Upload from '@/components/ui/Upload' // Uncomment if you use the custom Upload component

const { Tr, Th, Td, THead, TBody } = Table

// --- Logic ---
import dayjs from 'dayjs'
import { useTemplateStore, Template } from '@/store/templateStore'
// Note: We removed 'axios' import because we use the store function now

const TemplateList = () => {
    // --- Stores ---
    const {
        templates,
        isLoading,
        getTemplates,
        createTemplate,
        updateTemplate,
        deleteTemplate,
        downloadTemplate, // ✨ NEW: Import the download action
    } = useTemplateStore()

    // --- State ---
    const [searchQuery, setSearchQuery] = useState('')

    // Modal State
    const [dialogOpen, setDialogOpen] = useState(false)
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form State
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(
        null,
    )
    const [formName, setFormName] = useState('')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    // --- Fetch Data ---
    useEffect(() => {
        getTemplates()
    }, [])

    // --- Handlers ---

    const openCreateDialog = () => {
        setEditingTemplate(null)
        setFormName('')
        setSelectedFile(null)
        setDialogOpen(true)
    }

    const openEditDialog = (template: Template) => {
        setEditingTemplate(template)
        setFormName(template.name)
        setSelectedFile(null) // Reset file, user only uploads if they want to change it
        setDialogOpen(true)
    }

    const openDeleteDialog = (template: Template) => {
        setEditingTemplate(template)
        setDeleteDialogOpen(true)
    }

    // --- Action: Download (FIXED) ---
    const handleDownload = async (row: Template) => {
        // We use the Store function now to handle Headers & Blob correctly
        const fileName = row.filePath || `${row.name}.html`
        await downloadTemplate(row.id, fileName)
    }

    // --- Action: Submit (Create/Update) ---
    const handleSubmit = async () => {
        if (!formName) {
            toast.push(
                <Notification type="warning">
                    Nomini kiritish shart
                </Notification>,
            )
            return
        }

        // For Create, file is required. For Update, it's optional.
        if (!editingTemplate && !selectedFile) {
            toast.push(
                <Notification type="warning">Fayl tanlash shart</Notification>,
            )
            return
        }

        setIsSubmitting(true)
        try {
            if (editingTemplate) {
                // UPDATE
                await updateTemplate(editingTemplate.id, formName, selectedFile)
                toast.push(
                    <Notification type="success">
                        Muvaffaqiyatli yangilandi
                    </Notification>,
                )
            } else {
                // CREATE
                if (selectedFile) {
                    await createTemplate(formName, selectedFile)
                    toast.push(
                        <Notification type="success">
                            Muvaffaqiyatli yaratildi
                        </Notification>,
                    )
                }
            }
            setDialogOpen(false)
            getTemplates() // Refresh list
        } catch (error) {
            toast.push(
                <Notification type="danger">Xatolik yuz berdi</Notification>,
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    // --- Action: Delete ---
    const confirmDelete = async () => {
        if (!editingTemplate) return
        setIsSubmitting(true)
        try {
            await deleteTemplate(editingTemplate.id)
            toast.push(<Notification type="success">O'chirildi</Notification>)
            setDeleteDialogOpen(false)
            getTemplates()
        } catch (error) {
            toast.push(
                <Notification type="danger">O'chirishda xatolik</Notification>,
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    // --- Filter Logic ---
    const filteredTemplates = useMemo(() => {
        if (!templates) return []
        return templates.filter((item) =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase()),
        )
    }, [templates, searchQuery])

    // --- File Input Handler ---
    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0])
        }
    }

    return (
        <div className="p-4">
            <Card className="mb-4 border border-gray-200 shadow-sm rounded-xl">
                <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
                    <div className="w-full sm:w-64">
                        <Input
                            prefix={<HiOutlineSearch />}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            size="sm"
                            placeholder="Shablon nomi..."
                        />
                    </div>
                    <Button
                        variant="solid"
                        size="sm"
                        icon={<HiOutlinePlus />}
                        onClick={openCreateDialog}
                    >
                        Yangi Shablon
                    </Button>
                </div>
            </Card>

            <Card className="border border-gray-200 rounded-xl overflow-hidden">
                <Table>
                    <THead>
                        <Tr>
                            <Th>ID</Th>
                            <Th>Nomi</Th>
                            <Th>Yaratilgan sana</Th>
                            <Th className="text-right">Amallar</Th>
                        </Tr>
                    </THead>
                    <TBody>
                        {isLoading ? (
                            <Tr>
                                <Td colSpan={4} className="text-center py-10">
                                    <Spinner size="40px" />
                                </Td>
                            </Tr>
                        ) : filteredTemplates.length === 0 ? (
                            <Tr>
                                <Td
                                    colSpan={4}
                                    className="text-center py-6 text-gray-500"
                                >
                                    Ma'lumot topilmadi
                                </Td>
                            </Tr>
                        ) : (
                            filteredTemplates.map((row) => (
                                <Tr key={row.id}>
                                    <Td className="w-[80px]">{row.id}</Td>
                                    <Td className="font-semibold text-gray-700">
                                        <div className="flex items-center gap-2">
                                            <HiOutlineDocumentText className="text-lg text-blue-500" />
                                            {row.name}
                                        </div>
                                    </Td>
                                    <Td>
                                        {dayjs(row.createdOn).format(
                                            'DD.MM.YYYY HH:mm',
                                        )}
                                    </Td>
                                    <Td className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                size="xs"
                                                variant="twoTone"
                                                color="blue-600"
                                                icon={<HiOutlineDownload />}
                                                onClick={() =>
                                                    handleDownload(row)
                                                }
                                            />
                                            <Button
                                                size="xs"
                                                variant="twoTone"
                                                icon={<HiOutlinePencil />}
                                                onClick={() =>
                                                    openEditDialog(row)
                                                }
                                            />
                                            <Button
                                                size="xs"
                                                variant="twoTone"
                                                color="red-600"
                                                icon={<HiOutlineTrash />}
                                                onClick={() =>
                                                    openDeleteDialog(row)
                                                }
                                            />
                                        </div>
                                    </Td>
                                </Tr>
                            ))
                        )}
                    </TBody>
                </Table>
            </Card>

            {/* --- Create / Edit Dialog --- */}
            <Dialog
                isOpen={dialogOpen}
                onClose={() => setDialogOpen(false)}
                title={
                    editingTemplate
                        ? 'Shablonni tahrirlash'
                        : "Yangi shablon qo'shish"
                }
                width={500}
            >
                <div className="flex flex-col gap-4 mt-4">
                    <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-600">
                            Nomi
                        </label>
                        <Input
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            placeholder="Shablon nomini kiriting"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-1 text-gray-600">
                            Fayl (HTML)
                        </label>
                        <div className="border border-gray-300 rounded-lg p-2 bg-gray-50">
                            <input
                                type="file"
                                accept=".html,.htm"
                                onChange={onFileChange}
                                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                            />
                        </div>
                        {editingTemplate && !selectedFile && (
                            <p className="text-xs text-gray-400 mt-1">
                                Yangi fayl tanlamasangiz, eskisi saqlanib
                                qoladi.
                            </p>
                        )}
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                        <Button
                            variant="plain"
                            onClick={() => setDialogOpen(false)}
                            disabled={isSubmitting}
                        >
                            Bekor qilish
                        </Button>
                        <Button
                            variant="solid"
                            loading={isSubmitting}
                            onClick={handleSubmit}
                        >
                            Saqlash
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* --- Delete Confirmation Dialog --- */}
            <Dialog
                isOpen={deleteDialogOpen}
                onClose={() => setDeleteDialogOpen(false)}
                title="Shablonni o'chirish"
                width={400}
            >
                <div className="mt-4">
                    <p className="text-gray-600 mb-6">
                        Haqiqatan ham <strong>{editingTemplate?.name}</strong>{' '}
                        shablonini o'chirmoqchimisiz? Bu amalni ortga qaytarib
                        bo'lmaydi.
                    </p>
                    <div className="flex justify-end gap-2">
                        <Button
                            variant="plain"
                            onClick={() => setDeleteDialogOpen(false)}
                            disabled={isSubmitting}
                        >
                            Yo'q
                        </Button>
                        <Button
                            variant="solid"
                            color="red-600"
                            loading={isSubmitting}
                            onClick={confirmDelete}
                        >
                            Ha, o'chirish
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    )
}

export default TemplateList
