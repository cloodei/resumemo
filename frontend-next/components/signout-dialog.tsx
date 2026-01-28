"use client"

import { LogOut } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import { useAuth } from "@/components/auth-provider"

type SignOutDialogProps = {
	trigger: React.ReactElement
}

export function SignOutDialog({ trigger }: SignOutDialogProps) {
	const router = useRouter()
	const { signOut } = useAuth()
	const [open, setOpen] = useState(false)
	const [isSigningOut, setIsSigningOut] = useState(false)

	const handleConfirm = async () => {
		setIsSigningOut(true)
		try {
			await signOut()
			toast.success("Signed out")
			router.push("/login")
		} catch {
			toast.error("Unable to sign out")
		} finally {
			setIsSigningOut(false)
			setOpen(false)
		}
	}

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{trigger}
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<LogOut className="size-4 text-destructive" />
						Sign out
					</DialogTitle>
					<DialogDescription>
						You will need to sign in again to access your workspace.
					</DialogDescription>
				</DialogHeader>
				<DialogFooter className="sm:justify-end">
					<Button variant="ghost" onClick={() => setOpen(false)} disabled={isSigningOut}>
						Cancel
					</Button>
					<Button
						variant="destructive"
						onClick={handleConfirm}
						disabled={isSigningOut}
					>
						{isSigningOut ? "Signing out..." : "Sign out"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	)
}
