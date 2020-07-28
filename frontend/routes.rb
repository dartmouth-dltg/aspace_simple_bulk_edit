ArchivesSpace::Application.routes.draw do
  match('/plugins/aspace_simple_bulk_edit/summary' => 'aspace_simple_bulk_edit#summary', :via => [:post])
  match('/plugins/aspace_simple_bulk_edit/update' => 'aspace_simple_bulk_edit#update', :via => [:post])
end
